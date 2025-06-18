
import React from 'react';

interface JobInputProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  // companyName and setCompanyName props are removed
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
        <h2 className="text-2xl font-semibold text-sky-400 mb-4">2. Target Role Details</h2>
        
        {/* Company Name input field removed */}
        
        <div>
          <label htmlFor="job-description" className="block text-sm font-medium text-slate-300 mb-1">
            Job Description
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Paste the full job description. The company name will be automatically extracted. The more detail, the better the AI can tailor your letter.
          </p>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste job description here... The app will try to extract the company name."
            rows={10}
            className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 placeholder-slate-500"
          />
        </div>
      </div>

      <div className="p-6 bg-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-semibold text-sky-400 mb-4">3. Letter Header (Optional)</h2>
        <p className="text-sm text-slate-400 mb-3">
          Enter any fixed header content (e.g., your contact info, date, company address).
          The AI will generate the letter body following this header and the greeting.
        </p>
        <textarea
          value={letterHeader}
          onChange={(e) => setLetterHeader(e.target.value)}
          placeholder="Your Name\nYour Address\nYour Contact Info\n\nDate\n\nHiring Manager Name (if known, or use company address part here)"
          rows={8}
          className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 placeholder-slate-500"
        />
      </div>
    </div>
  );
};

export default JobInput;
