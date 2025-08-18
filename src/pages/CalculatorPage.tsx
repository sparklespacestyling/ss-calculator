import QuoteCalculator from '@/components/QuoteCalculator';

const CalculatorPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sparkle Space</h1>
              <p className="text-sm text-slate-600">Quote Calculator</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Property Styling Quote Calculator</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <QuoteCalculator />
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              This is an estimate only.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalculatorPage;