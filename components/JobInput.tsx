
import React from 'react';

interface JobInputProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  letterHeader: string;
  setLetterHeader: (value: string) => void;
}

const JobInput: React.FC<JobInputProps> = ({
  jobDescription,
  setJobDescription,
  letterHeader,
  setLetterHeader,
}) => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-semibold text-sky-400 mb-4">2. Job Description</h2>
        <p className="text-sm text-slate-400 mb-3">
          Paste the full job description here. The more detail, the better the AI can tailor your letter.
        </p>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste job description here..."
          rows={10}
          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 placeholder-slate-500"
        />
      </div>

      <div className="p-6 bg-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-semibold text-sky-400 mb-4">3. Letter Header (Optional)</h2>
        <p className="text-sm text-slate-400 mb-3">
          Enter any fixed header content (e.g., your contact info, date, company address, greeting like "Dear Hiring Manager,").
          The AI will generate the letter body following this header.
        </p>
        <textarea
          value={letterHeader}
          onChange={(e) => setLetterHeader(e.target.value)}
          placeholder="Your Name\nYour Address\nYour Contact Info\n\nDate\n\nHiring Manager Name (if known)\nCompany Name\nCompany Address\n\nDear Hiring Manager,"
          rows={8}
          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 placeholder-slate-500"
        />
      </div>
    </div>
  );
};

export default JobInput;
