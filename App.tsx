
import React, { useState, useCallback, useEffect } from 'react';
import PdfUpload from './components/PdfUpload';
import JobInput from './components/JobInput';
import LetterPreview from './components/LetterPreview';
import Spinner from './components/Spinner';
import { generateCoverLetterBody } from './services/geminiService';
import { generatePdfFromText } from './services/pdfUtils';
import { CVData } from './types';
import { APP_TITLE } from './constants';
import { SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from './components/icons';

// Function to extract company name with improved accuracy
const extractCompanyNameFromJD = (jd: string): string => {
  if (!jd || jd.trim().length < 20) return ''; // Basic check for empty or too short JD

  // Regex for what a company name might look like (1-5 words, starting caps, common suffixes)
  // Allowing numbers for names like "7-Eleven" or "F1 Solutions"
  // Ensured that it captures words starting with a capital letter or a number.
  const companyWord = String.raw`[A-Z0-9][A-Za-z0-9&.'-]*`;
  const companyNamePattern = String.raw`${companyWord}(?:\s+${companyWord}){0,4}(?:,? (?:Inc|Ltd|LLC|Corp|GmbH|AG|Co|PLC|LP|LLP|Foundation|Solutions|Technologies|Group|Systems|Labs|Industries|Enterprises|Services|International|Global|Holdings|Ventures|Partners|Associates)(?:\.|\b))?`;

  const commonTrailingPhrases = [
    "is hiring", "is looking for", "is seeking", "is a leading", "is a subsidiary of",
    "is an equal opportunity employer", "invites applications for", "is pleased to announce",
    "is a dynamic", "is a company", "is part of", "is an award-winning", "is a fast-growing",
    "is a global leader", "is a technology", "headquartered in", "based in",
    "is currently recruiting", "has an exciting opportunity", "operates as", "specializes in",
    "Inc\\.", "Ltd\\.", "LLC", "Corp\\.", "GmbH", "AG", "Co\\." // Also clean standalone suffixes if they are part of a longer phrase
  ].join('|');
  const cleaningPattern = new RegExp(String.raw`\s*(?:${commonTrailingPhrases}).*`, "i");

  const patterns = [
    // Strongest: Explicit labels. Case insensitive.
    { regex: new RegExp(String.raw`\b(?:Company|The Company|Organization|Employer|Hiring Organization|Client|Our Client|About the Company|About Our Company|About Us at|Working at|Work for|Role with)\s*:\s*(${companyNamePattern})`, "i"), group: 1 },
    { regex: new RegExp(String.raw`\b(?:About|Welcome to|Join|Work at|Work for|More about|Learn more about|Introduction to|Team at|Careers at)\s+(${companyNamePattern})\b`, "i"), group: 1 },
    
    // Company name at the beginning of a sentence, followed by a verb/description
    // e.g. "Contoso Ltd. is looking for a..." - Must be at start of a line (m flag)
    { regex: new RegExp(String.raw`^(${companyNamePattern})\s+(?:is\s|was\s|has\s|provides\s|develops\s|operates\s|focuses\s|specializes\s|are\s|were\s|have\s|are looking for|are hiring|seeks to|a leading|a subsidiary of)`, "im"), group: 1 },
    
    // "We are [CompanyName], a..." or "Meet [CompanyName]"
    { regex: new RegExp(String.raw`\b(?:We are|We're|I am|I'm|Meet)\s+(${companyNamePattern}),?\s+(?:a|an|the|the leading|a global|seeking|hiring|looking|a team of)`, "i"), group: 1 },
    
    // Mentioned after a job title, e.g. "Software Engineer at [CompanyName]"
    // Be specific to avoid grabbing parts of the JD.
    { regex: new RegExp(String.raw`\b(?:position at|opportunity at|role at|vacancy at|opening at|job with|career with|join the team at)\s+(${companyNamePattern})\b`, "i"), group: 1 },

    // "[CompanyName] invites applications..." or "[CompanyName], a leader in..."
    { regex: new RegExp(String.raw`^(${companyNamePattern}),?\s*(?:invites applications|a leader in|a well-established|an innovative)`, "im"), group: 1 }
  ];

  const lines = jd.split('\n'); // Process line by line for some patterns or overall

  for (const p of patterns) {
    // Test on the full JD first
    let match = jd.match(p.regex);
    if (match && match[p.group]) {
        let company = match[p.group].trim();
        company = company.replace(/^[",.;:“]+|[",.;:“]+$/g, "").trim(); // Remove surrounding quotes/punctuation
        company = company.replace(cleaningPattern, "").trim();

        // Further validation
        if (isValidCompanyName(company)) return company;
    }

    // Then test line by line for anchored patterns (especially ^)
    if (p.regex.source.includes('^')) {
        for (const line of lines) {
            match = line.match(p.regex);
            if (match && match[p.group]) {
                let company = match[p.group].trim();
                company = company.replace(/^[",.;:“]+|[",.;:“]+$/g, "").trim();
                company = company.replace(cleaningPattern, "").trim();
                if (isValidCompanyName(company)) return company;
            }
        }
    }
  }
  
  // Last resort: Check for a name in all caps if it's 1-4 words long (like "ACME CORP")
  // and doesn't look like an acronym for a requirement (e.g., "SQL", "AWS").
  // This is less reliable but can catch some cases.
  const allCapsRegex = /\b([A-Z][A-Z0-9\s&'-]{2,30}[A-Z0-9])\b/g;
  let allCapsMatch;
  while ((allCapsMatch = allCapsRegex.exec(jd)) !== null) {
      let company = allCapsMatch[1].trim();
      const words = company.split(/\s+/);
      if (words.length >= 1 && words.length <= 4 && !/^\d+$/.test(company)) {
          const isMostlyCaps = words.every(word => /^[A-Z0-9&'-]+$/.test(word) && !/^(AND|THE|OF|FOR|AN|A|IS)$/.test(word));
          const commonAcronyms = /^(SQL|AWS|API|CEO|CFO|CTO|HR|IT|QA|USA|UK|EU|KPI|MBA|PhD|PDF|HTML|CSS|JS|JSON|XML)$/i;
          if(isMostlyCaps && !words.some(word => commonAcronyms.test(word))) {
            if (isValidCompanyName(company, true)) return company;
          }
      }
  }

  return ''; // Return empty if no confident extraction
};

const isValidCompanyName = (name: string, isAllCapsCheck: boolean = false): boolean => {
    if (!name || name.length < 2) return false; // Too short
    
    // Avoid if it's just common prepositions or articles often left after cleaning
    if (/^(at|for|with|join|of|the|a|an|our|my|this|that|is|are|was|were)$/i.test(name)) return false;

    // Split into words
    const words = name.split(/\s+/);
    if (words.length > 5 && !isAllCapsCheck) return false; // Too many words for a typical company name unless it's a known long one
    if (words.length > 6 && isAllCapsCheck) return false; // Slightly more leeway for all caps

    // Check if it looks like a generic job requirement or phrase
    const commonNonCompanyWords = /^(Manager|Developer|Engineer|Analyst|Specialist|Role|Position|Opportunity|Department|Team|Location|Salary|Benefits|Requirements|Responsibilities|Qualifications|Experience|Education|Skills|Contract|Full-time|Part-time|Remote|Hybrid|Senior|Junior|Lead|Principal|Staff|Years|Degree|Bachelor|Master|Fluent|Proficient|Strong|Excellent|Good|Understanding|Knowledge|Ability|Must|Have|Be|Able|To|Work|With|And|Or|Plus)\b/i;
    if (words.some(word => commonNonCompanyWords.test(word) && words.length === 1)) return false; // Single common word is not a company
    if (commonNonCompanyWords.test(words[0]) && words.length > 1 && !/(?:Inc|Ltd|LLC|Corp|GmbH|AG|Co|PLC|Group|Solutions|Technologies|Systems|Labs|Industries|Enterprises|Services|International|Global|Holdings)\b/i.test(name)) {
        // e.g. "Senior Developer position" should not be "Senior Developer"
        return false;
    }

    // Avoid if it's just numbers or mostly numbers unless it's a known pattern like F1
    if (/^\d[\d\s.-]*$/.test(name) && !name.includes(" ")) return false; // "2024" or "123" is not a company

    if (name.toLowerCase() === "us" || name.toLowerCase() === "we" || name.toLowerCase() === "me" || name.toLowerCase() === "i") return false;
    if (name.toLowerCase().includes("http:") || name.toLowerCase().includes("https:")) return false; // URLs
    if (name.split(' ').every(word => word.length < 2) && name.length > 1) return false; // "A B C"

    // Check if it ends with a possessive 's typically meaning "company's office" not the company name
    if (name.endsWith("'s") || name.endsWith("’s")) {
        return false;
    }
    
    // Check if it's a date or time
    if (/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b.*\d{1,4}/i.test(name)) return false;
    if (/\b\d{1,2}:\d{2}(?:\s*(?:AM|PM))?\b/i.test(name)) return false;


    return true;
};


const App: React.FC = () => {
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>(''); // Will be auto-extracted
  const [jobDescription, setJobDescription] = useState<string>('');
  const [letterHeader, setLetterHeader] = useState<string>('');
  const [generatedLetterBody, setGeneratedLetterBody] = useState<string | null>(null);
  
  const [isGeneratingLetter, setIsGeneratingLetter] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("CRITICAL: Gemini API Key (process.env.API_KEY) is not configured. The app will not function.");
      setApiKeyMissing(true);
    }
  }, []);

  useEffect(() => {
    if (jobDescription) {
      const extractedName = extractCompanyNameFromJD(jobDescription);
      setCompanyName(extractedName); 
    } else {
      setCompanyName(''); // Clear if job description is cleared
    }
  }, [jobDescription]);

  const handleCvUploaded = useCallback((data: CVData) => {
    setCvData(data);
    setError(null);
    setGeneratedLetterBody(null);
    setSuccessMessage(null);
  }, []);

  const handleUserNameChange = useCallback((name: string) => {
    setUserName(name);
  }, []);

  const handleGenerateLetter = async () => {
    if (!cvData?.text) {
      setError('Please upload your CV.');
      return;
    }
    if (!userName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!jobDescription) {
      setError('Please provide a job description.');
      return;
    }
    const finalCompanyNameForPrompt = companyName.trim() || "the target company"; 

    if (apiKeyMissing) {
      setError("Cannot generate letter: API Key is missing.");
      return;
    }

    setIsGeneratingLetter(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedLetterBody(null);

    try {
      const body = await generateCoverLetterBody(cvData.text, jobDescription, letterHeader, finalCompanyNameForPrompt);
      setGeneratedLetterBody(body);
      setSuccessMessage('Cover letter generated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the letter.');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const getFullLetterText = useCallback(() => {
    const greeting = `Dear ${companyName.trim() || 'Hiring'} Team,`;
    let fullText = '';

    if (letterHeader.trim()) {
      fullText += letterHeader.trim() + '\n\n';
    }
    fullText += greeting + '\n\n';
    if (generatedLetterBody) {
      fullText += generatedLetterBody.trim() + '\n\n';
    }
    fullText += 'Best Regards,\n';
    fullText += userName.trim();
    
    return fullText;
  }, [letterHeader, companyName, generatedLetterBody, userName]);


  const handleDownloadPdf = async () => {
    if (!generatedLetterBody) {
      setPdfError("No letter content to download.");
      return;
    }
    const safeCompanyName = (companyName.trim() || 'company').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `cover-letter-${safeCompanyName}`;

    setIsDownloadingPdf(true);
    setPdfError(null);
    try {
      const fullText = getFullLetterText();
      generatePdfFromText(fullText, fileName);
    } catch (err) {
       setPdfError(err instanceof Error ? err.message : 'Failed to download PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };
  
  const canGenerate = cvData?.text && userName.trim() && jobDescription && !isGeneratingLetter && !apiKeyMissing;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 sm:p-8 text-slate-100 selection:bg-sky-500 selection:text-white">
      <header className="w-full max-w-6xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300 py-2">
          {APP_TITLE}
        </h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">
          Craft compelling, personalized cover letters in minutes. Upload your CV, paste the job description, and let AI do the heavy lifting!
        </p>
         {companyName && (
          <p className="text-sm text-sky-300 mt-2 italic">Extracted Company: {companyName}</p>
        )}
         {!companyName && jobDescription && ( // Show if JD is present but no company name was extracted
          <p className="text-sm text-amber-400 mt-2 italic">Could not automatically extract company name. Using default.</p>
        )}
      </header>

      {error && (
        <div className="w-full max-w-3xl mb-6 bg-red-800/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative flex items-start" role="alert">
          <AlertTriangleIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0 text-red-300" />
          <div>
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-300 hover:text-red-100">
            <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </button>
        </div>
      )}

      {successMessage && (
         <div className="w-full max-w-3xl mb-6 bg-green-800/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg relative flex items-start" role="alert">
          <CheckCircleIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0 text-green-300" />
          <div>
            <strong className="font-bold">Success: </strong>
            <span className="block sm:inline">{successMessage}</span>
          </div>
           <button onClick={() => setSuccessMessage(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-green-300 hover:text-green-100">
            <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </button>
        </div>
      )}

      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <PdfUpload 
            onCvUploaded={handleCvUploaded} 
            cvData={cvData}
            userName={userName}
            onUserNameChange={handleUserNameChange}
          />
          <JobInput
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            letterHeader={letterHeader}
            setLetterHeader={setLetterHeader}
          />
          <button
            onClick={handleGenerateLetter}
            disabled={!canGenerate || isGeneratingLetter}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:text-sky-500 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center text-lg transition-all duration-200 ease-in-out shadow-lg hover:shadow-sky-500/30 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75"
          >
            {isGeneratingLetter ? (
              <>
                <Spinner /> <span className="ml-3">Generating Your Masterpiece...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-6 h-6 mr-3" /> Generate Cover Letter
              </>
            )}
          </button>
        </div>
        
        <div className="md:sticky md:top-8 h-[calc(100vh-10rem)] md:h-auto md:max-h-[calc(100vh-4rem)]">
          <LetterPreview
            letterHeader={letterHeader}
            companyName={companyName} 
            generatedLetterBody={generatedLetterBody}
            userName={userName}
            isLoadingPdf={isDownloadingPdf}
            onDownloadPdf={handleDownloadPdf}
            pdfError={pdfError}
          />
        </div>
      </main>
      <footer className="w-full max-w-6xl mt-12 text-center text-slate-500 text-xs">
        <p>Powered by Google Gemini. Developed by Abdullah Zeeshan.</p>
        <p>&copy; {new Date().getFullYear()} AI Cover Letter Generator.</p>
      </footer>
    </div>
  );
};

export default App;
