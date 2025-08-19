import QuoteCalculator from '@/components/QuoteCalculator';
import logoUrl from '/android-chrome-192x192.png';
import logoHeader from '/sparkle-space-logo-header.png';

const CalculatorPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 py-2">
          <div className="flex items-center justify-center max-w-4xl mx-auto">
            <img 
              src={logoHeader} 
              alt="Sparkle Space Logo" 
              className="h-12 object-contain"
              onError={(e) => {
                console.error('Logo header failed to load, falling back to text');
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden">
              <h1 className="text-xl font-bold text-slate-900">Sparkle Space</h1>
              <p className="text-sm text-slate-600">Quote Calculator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Quote Calculator</h2>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <QuoteCalculator />
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center no-print">
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