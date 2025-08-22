
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CalculatorPage from "./pages/CalculatorPage";
import XeroAuth from "./pages/XeroAuth";

const App = () => {
  return (
    <Router basename="/ss-calculator">
      <Routes>
        <Route path="/" element={<CalculatorPage />} />
        <Route path="/xero-auth" element={<XeroAuth />} />
      </Routes>
    </Router>
  );
};

export default App;
