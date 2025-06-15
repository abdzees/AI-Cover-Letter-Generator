
import React, { useState, useCallback } from 'react';
import { CVData } from '../types';
import { extractTextFromPdf } from '../services/pdfUtils';
import { UploadIcon, FileTextIcon, AlertTriangleIcon } from './icons';
import Spinner from './Spinner';

interface PdfUploadProps {
  onCvUploaded: (cvData: CVData) => void;
  cvData: CVData | null;
  userName: string;
  onUserNameChange: (name: string) => void;
}

const PdfUpload: React.FC<PdfUploadProps> = ({ 
  onCvUploaded, 
  cvData,
  userName,
  onUserNameChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        onCvUploaded({fileName: '', text: ''}); // Clear previous data
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size exceeds 5MB. Please upload a smaller PDF.');
        onCvUploaded({fileName: '', text: ''}); // Clear previous data
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const text = await extractTextFromPdf(file);
        onCvUploaded({ fileName: file.name, text });
      } catch (err) {
        console.error("Error extracting text from PDF:", err);
        setError('Failed to extract text from PDF. Please try another file.');
        onCvUploaded({fileName: '', text: ''}); // Clear previous data
      } finally {
        setIsLoading(false);
      }
    }
  }, [onCvUploaded]);

  return (
    <div className="p-6 bg-slate-800 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-semibold text-sky-400 mb-4">1. Your Details</h2>
      
      <div className="mb-6">
        <label
          htmlFor="cv-upload"
          className={`
            flex flex-col items-center justify-center w-full h-48 px-4 
            border-2 border-dashed rounded-lg cursor-pointer 
            bg-slate-700 border-slate-600 hover:border-sky-500 hover:bg-slate-600
            transition-colors duration-200 ease-in-out
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            ${error && !cvData?.fileName ? 'border-red-500' : ''} 
          `}
        >
          {isLoading ? (
            <Spinner />
          ) : cvData && cvData.fileName ? (
             <div className="text-center">
              <FileTextIcon className="w-16 h-16 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-slate-300">CV Uploaded:</p>
              <p className="text-lg font-medium text-green-300 truncate max-w-xs">{cvData.fileName}</p>
              <p className="text-xs text-slate-400 mt-1">Click to re-upload</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadIcon className="w-12 h-12 text-sky-400 mb-3" />
              <p className="mb-2 text-sm text-slate-300">
                <span className="font-semibold">Upload CV</span> (PDF, MAX. 5MB)
              </p>
              <p className="text-xs text-slate-400">Click or drag and drop</p>
            </div>
          )}
          <input
            id="cv-upload"
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </label>
        {error && !cvData?.fileName && ( // Only show PDF upload error if no CV is successfully uploaded
          <div className="mt-3 flex items-center text-sm text-red-400 bg-red-900/30 p-3 rounded-md">
            <AlertTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="user-name" className="block text-sm font-medium text-slate-300 mb-1">
          Your Full Name (for letter sign-off)
        </label>
        <input
          type="text"
          id="user-name"
          value={userName}
          onChange={(e) => onUserNameChange(e.target.value)}
          placeholder="e.g., Jane Doe"
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 placeholder-slate-500"
          required
        />
      </div>
    </div>
  );
};

export default PdfUpload;
