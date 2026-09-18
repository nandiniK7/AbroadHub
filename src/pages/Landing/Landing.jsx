import { React, splashLogo } from '../../shared/deps.js';
import { Search, CalendarDays, Moon, BriefcaseBusiness, GraduationCap, ShoppingBag, Users, Utensils, Scale, Plane, IceCreamCone, Building2 } from 'lucide-react';

const chips = [
  ['Hooper', Search], ['Tournaments', CalendarDays], ['Night Clubs', Moon], ['Events', CalendarDays],
  ['Find Real Estate', Building2], ['Tax Filing', Scale], ['Edu-Co', GraduationCap], ['Groceries', ShoppingBag],
  ['Find Consultants', Users], ['Find Restaurants', Utensils], ['Legal Consultants', Scale],
  ['Visa - Immigration', Plane], ['Ice Creams', IceCreamCone]
];

export default function Landing({ onExplore, onLogin, onSignup }) {
  return (
    <main className="splash-page">
      <div className="splash-content">
        <div className="splash-brand"><img className="splash-brand-logo" src={splashLogo} alt="AbroadHub"/><strong>AbroadHub</strong></div>
        <div className="splash-category-area">
          {chips.map(([label, Icon]) => <span className="splash-category-chip" key={label}><Icon className="splash-category-icon"/>{label}</span>)}
        </div>
        <section className="splash-copy">
          <span className="splash-eyebrow">YOUR COMMUNITY, ANYWHERE</span>
          <h1>Find Anything in<br/>your Neighborhood</h1>
          <p>Discover people who share your interests and connect with your community, wherever life takes you.</p>
          <div className="splash-actions">
            <button className="splash-explore-button" onClick={onExplore}>Let’s Explore</button>
            <button className="splash-secondary-button" onClick={onSignup}>Create an account</button>
          </div>
        </section>
        <div className="splash-quick-links"><button onClick={onLogin}>Log in</button><span>•</span><button onClick={onExplore}>Explore as guest</button></div>
      </div>
    </main>
  );
}
