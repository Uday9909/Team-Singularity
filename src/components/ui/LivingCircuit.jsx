import { useNavigate } from 'react-router-dom';

export function LivingCircuit() {
  const navigate = useNavigate();

  return (
    <section 
      style={{
        position: 'relative',
        zIndex: 1,
        padding: 'clamp(60px, 6vw, 100px) 0',
        borderTop: '1px solid var(--hairline)',
        background: 'radial-gradient(circle at center, rgba(57,255,106,0.05) 0%, var(--void) 70%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        overflow: 'hidden'
      }}
      onClick={() => navigate('/stack')}
      className="group"
    >
      <style>
        {`
          @keyframes circuitDash {
            0% { stroke-dashoffset: 1000; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes circuitGlow {
            0% { opacity: 0.3; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1.2); }
          }
          .circuit-path {
            stroke-dasharray: 1000;
            animation: circuitDash 3s ease-in-out infinite alternate;
          }
          .circuit-node {
            animation: circuitGlow 1.5s ease-in-out infinite alternate;
            transform-origin: center;
            transform-box: fill-box;
          }
        `}
      </style>
      <div style={{ position: 'relative', width: '100%', maxWidth: '800px', height: '300px' }}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 800 300" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Background grid/dots optional */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--bone)" opacity="0.1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Circuit Paths */}
          <g stroke="var(--phosphor)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
            {/* Left side */}
            <path className="circuit-path" d="M100 150 L250 150 L300 200 L350 200" />
            <path className="circuit-path" d="M150 50 L200 50 L250 100 L350 100" />
            <path className="circuit-path" d="M50 250 L200 250 L250 180 L350 180" />
            
            {/* Right side */}
            <path className="circuit-path" d="M700 150 L550 150 L500 100 L450 100" />
            <path className="circuit-path" d="M650 250 L600 250 L550 200 L450 200" />
            <path className="circuit-path" d="M750 50 L600 50 L550 120 L450 120" />
          </g>

          {/* Circuit Nodes (endpoints) */}
          <g fill="var(--phosphor)">
            <circle className="circuit-node" cx="100" cy="150" r="4" />
            <circle className="circuit-node" cx="150" cy="50" r="4" />
            <circle className="circuit-node" cx="50" cy="250" r="4" />
            
            <circle className="circuit-node" cx="700" cy="150" r="4" />
            <circle className="circuit-node" cx="650" cy="250" r="4" />
            <circle className="circuit-node" cx="750" cy="50" r="4" />
          </g>
        </svg>

        {/* Central Core Button */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(11,15,10,0.8)',
            border: '1px solid var(--phosphor)',
            padding: '24px 48px',
            borderRadius: '12px',
            boxShadow: '0 0 30px rgba(57,255,106,0.15), inset 0 0 20px rgba(57,255,106,0.05)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}
          className="group-hover:bg-opacity-90 group-hover:shadow-[0_0_40px_rgba(57,255,106,0.3)] group-hover:scale-105"
        >
          <span className="font-mono text-xs tracking-[0.3em]" style={{ color: 'var(--bone)', opacity: 0.6 }}>
            SYSTEM DATAFLOW
          </span>
          <span className="font-display font-bold" style={{ fontSize: '1.5rem', color: 'var(--phosphor)', textShadow: '0 0 12px rgba(57,255,106,0.5)' }}>
            EXPLORE TECH STACK
          </span>
          <div 
            style={{ 
              width: '100%', 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, var(--phosphor), transparent)',
              marginTop: '8px',
              opacity: 0.5
            }} 
          />
        </div>
      </div>
    </section>
  );
}
