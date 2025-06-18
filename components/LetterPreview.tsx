
import React, { useRef } from 'react';
import { DownloadIcon, AlertTriangleIcon } from './icons';
import Spinner from './Spinner';

interface LetterPreviewProps {
  letterHeader: string;
  companyName: string; // This will now be the auto-extracted name (or empty string)
  generatedLetterBody: string | null;
  userName: string;
  isLoadingPdf: boolean;
  onDownloadPdf: () => Promise<void>;
  pdfError: string | null;
}

const LetterPreview: React.FC<LetterPreviewProps> = ({
  letterHeader,
  companyName,
  generatedLetterBody,
  userName,
  isLoadingPdf,
  onDownloadPdf,
  pdfError,
}) => {
  const letterContentRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    await onDownloadPdf(); 
  };
  
  // Greeting will use "Hiring Team" if companyName is empty or only whitespace
  const greeting = `Dear ${companyName.trim() || 'Hiring'} Team,`;

  const showPlaceholder = !generatedLetterBody && !letterHeader.trim() && !companyName.trim();


  if (showPlaceholder && !generatedLetterBody) { // Check only for generated body for placeholder if other fields might be briefly empty
    return (
      <div className="p-6 bg-slate-800 rounded-xl shadow-2xl h-full flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-400 text-lg">Your generated cover letter will appear here.</p>
        <p className="text-slate-500 text-sm">Fill in the details and click "Generate Letter".</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-800 rounded-xl shadow-2xl h-full flex flex-col">
      <h2 className="text-2xl font-semibold text-sky-400 mb-6">4. Preview & Download</h2>
      
      <div 
        id="letter-content-for-pdf"
        ref={letterContentRef} 
        className="flex-grow p-6 bg-white text-gray-800 font-serif text-sm leading-relaxed rounded-md shadow-inner overflow-y-auto mb-6 min-h-[400px]"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        {letterHeader.trim() && (
          <pre className="whitespace-pre-wrap font-serif text-sm">{letterHeader.trim()}</pre>
        )}

        {(letterHeader.trim()) && <div className="h-4"></div>}
        
        <pre className="whitespace-pre-wrap font-serif text-sm">{greeting}</pre>
        
        <div className="h-4"></div>

        {generatedLetterBody ? (
          <pre className="whitespace-pre-wrap font-serif text-sm">{generatedLetterBody.trim()}</pre>
        ) : (
             <p className="text-gray-400 font-serif text-sm italic mt-2">Letter body will appear here once generated...</p>
        )}

        {generatedLetterBody && userName.trim() && (
          <>
            <div className="h-6"></div>
            <pre className="whitespace-pre-wrap font-serif text-sm">Best Regards,</pre>
            <div className="h-2"></div>
            <pre className="whitespace-pre-wrap font-serif text-sm">{userName.trim()}</pre>
          </>
        )}
      </div>

      <button
        onClick={handleDownload}
        disabled={isLoadingPdf || !generatedLetterBody || !companyName.trim()} // Also disable if no company name for filename
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-800 disabled:text-green-500 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center transition-colors duration-200 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
        aria-label="Download cover letter as PDF"
      >
        {isLoadingPdf ? (
          <>
            <Spinner /> <span className="ml-2">Generating PDF...</span>
          </>
        ) : (
          <>
            <DownloadIcon className="w-5 h-5 mr-2" /> Download as PDF
          </>
        )}
      </button>
      {pdfError && (
         <div className="mt-3 flex items-center text-sm text-red-400 bg-red-900/30 p-3 rounded-md">
          <AlertTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          {pdfError}
        </div>
      )}
    </div>
  );
};

export default LetterPreview;
