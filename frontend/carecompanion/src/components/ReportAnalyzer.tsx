import React, { useState } from 'react';

export default function ReportAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setAnalysis(null); // Clear previous results when a new file is selected
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select a medical report first.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Ensure this matches your Flask port when running locally
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze the report');
      }
      
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-card rounded-lg shadow-sm border border-border">
      <h2 className="text-2xl font-medium mb-2 text-foreground">AI Report Analyzer</h2>
      <p className="text-muted-foreground mb-6">Upload a patient report (PDF or TXT) for an automated clinical summary.</p>
      
      {/* Upload Section */}
      <div className="mb-6 bg-muted/50 p-4 rounded-md border border-border border-dashed">
        <input 
          type="file" 
          accept=".pdf,.txt"
          onChange={handleFileChange}
          className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:opacity-90 transition-opacity cursor-pointer"
        />
      </div>

      <button 
        onClick={handleAnalyze}
        disabled={loading || !file}
        className="w-full sm:w-auto px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Analyzing Report...' : 'Analyze Report'}
      </button>

      {/* Error State */}
      {error && (
        <div className="mt-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Results Section */}
      {analysis && !loading && (
        <div className="mt-8 p-6 bg-secondary/20 rounded-md border border-border">
          <h3 className="text-lg font-medium mb-3 text-foreground flex items-center gap-2">
            Clinical Explanation
          </h3>
          <p className="text-foreground leading-relaxed">
            {analysis}
          </p>
        </div>
      )}
    </div>
  );
}