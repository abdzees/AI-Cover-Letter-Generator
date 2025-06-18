
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

const App: React.FC = () => {
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [letterHeader, setLetterHeader] = useState<string>('');
  const [generatedLetterBody, setGeneratedLetterBody] = useState<string | null>(null);
  const [extractedCompanyName, setExtractedCompanyName] = useState<string>('');
  
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

  const handleCvUploaded = useCallback((data: CVData) => {
    setCvData(data);
    setError(null); // Clear previous errors on new upload
    setGeneratedLetterBody(null); // Clear old letter
    setSuccessMessage(null);
    setExtractedCompanyName('');
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
    if (apiKeyMissing) {
      setError("Cannot generate letter: API Key is missing.");
      return;
    }

    setIsGeneratingLetter(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedLetterBody(null); // Clear previous generation
    setExtractedCompanyName(''); // Clear previous company name

    try {
      const body = await generateCoverLetterBody(cvData.text, jobDescription, letterHeader);
      setGeneratedLetterBody(body);

      // Company Name Extraction Logic
      let companyName = '';
      const companyRegex = /(?:Company|Organization):\s*([^
]+)/i;
      const companySuffixRegex = /(.+?)\s+(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Group|Solutions|Technologies)/i;

      const companyMatch = jobDescription.match(companyRegex);
      if (companyMatch && companyMatch[1]) {
        companyName = companyMatch[1].trim();
      }

      if (!companyName) {
        const suffixMatch = jobDescription.match(companySuffixRegex);
        if (suffixMatch && suffixMatch[1]) {
          companyName = suffixMatch[1].trim();
        }
      }
      setExtractedCompanyName(companyName);

      setSuccessMessage('Cover letter generated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000); // Clear success message after a few seconds
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the letter.');
      setExtractedCompanyName(''); // Clear on error too
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedLetterBody) {
      setPdfError("No letter content to download.");
      return;
    }
    setIsDownloadingPdf(true);
    setPdfError(null);
    try {
      const companyForFilename = extractedCompanyName?.trim().replace(/\s+/g, '-') || 'company';
      const fileName = `cover-letter-${companyForFilename}`;

      const pdfHeader = letterHeader || '';

      const greeting = `Dear ${extractedCompanyName || 'Hiring'} Team,\n\n`;
      const signOff = `\n\nBest Regards,\n${userName}`;
      const pdfBody = `${greeting}${generatedLetterBody}${signOff}`;

      await generatePdfFromText(
        pdfHeader,
        pdfBody,
        fileName
      );
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
        
        <div className="md:sticky md:top-8 h-[calc(100vh-10rem)] md:h-auto md:max-h-[calc(100vh-4rem)]"> {/* Adjusted for sticky behavior */}
          <LetterPreview
            letterHeader={letterHeader}
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
