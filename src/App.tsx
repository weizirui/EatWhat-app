import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import RecipeMatch from "@/pages/RecipeMatch";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import Recipes from "@/pages/Recipes";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <div className="min-h-screen w-full flex items-stretch justify-center md:py-6">
      <div className="w-full max-w-[480px] min-h-screen md:min-h-0 md:h-[860px] bg-cream relative shadow-[0_24px_60px_-20px_rgba(47,74,58,0.18)] md:rounded-[36px] overflow-hidden md:border md:border-ink/10">
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/ingredients" element={<Home />} />
            <Route path="/match" element={<RecipeMatch />} />
            <Route path="/checkout-success" element={<CheckoutSuccess />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}
