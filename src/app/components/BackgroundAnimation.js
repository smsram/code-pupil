'use client';
import { useEffect } from 'react';

export default function BackgroundAnimation() {
    useEffect(() => {
        const createRandomParticle = () => {
            const particle = document.createElement('div');
            particle.className = `particle type-${Math.floor(Math.random() * 4) + 1}`;
            const size = Math.random() * 12 + 4;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            
            const container = document.querySelector('.animation-container');
            if (container) {
                container.appendChild(particle);
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 8000);
            }
        };

        const createCodeSnippet = () => {
            const snippets = [
                '{}', '</>', '[]', '()', '++', '--', '=>', '&&', '||', 
                '!=', '==', '+=', '-=', '*=', '/=', '%=', '<?', '?>', 
                '#!', '//', '/*', '*/', '$$', '@@', '::', ';;', '~~',
                '^^', '<<', '>>', '&=', '|=', '^=', '**', '..',
                '...', '?.', '??', '!!', '<%', '%>', '<-', '->'
            ];
            
            const snippet = document.createElement('div');
            snippet.textContent = snippets[Math.floor(Math.random() * snippets.length)];
            snippet.className = 'code-symbol';
            snippet.style.cssText = `
                position: absolute;
                color: rgba(${Math.random() > 0.5 ? '6, 182, 212' : '168, 85, 247'}, 0.15);
                font-family: 'Courier New', monospace;
                font-size: ${1.2 + Math.random() * 0.8}rem;
                font-weight: bold;
                left: ${Math.random() * 100}%;
                top: 100%;
                animation: symbolFloat ${10 + Math.random() * 4}s linear forwards;
                pointer-events: none;
            `;
            
            const container = document.querySelector('.animation-container');
            if (container) {
                container.appendChild(snippet);
                setTimeout(() => {
                    if (snippet.parentNode) {
                        snippet.parentNode.removeChild(snippet);
                    }
                }, 12000);
            }
        };

        const particleInterval = setInterval(createRandomParticle, 4000);
        const codeInterval = setInterval(createCodeSnippet, 6000);

        return () => {
            clearInterval(particleInterval);
            clearInterval(codeInterval);
        };
    }, []);

    return (
        <div className="animation-container" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {/* Dynamic floating particles */}
            <div className="particle type-1" style={{ width: '6px', height: '6px', top: '20%', left: '10%', animationDelay: '0s' }}></div>
            <div className="particle type-2" style={{ width: '8px', height: '8px', top: '60%', left: '80%', animationDelay: '-2s' }}></div>
            <div className="particle type-3" style={{ width: '10px', height: '10px', top: '80%', left: '20%', animationDelay: '-4s' }}></div>
            <div className="particle type-4" style={{ width: '7px', height: '7px', top: '30%', left: '70%', animationDelay: '-1s' }}></div>
            <div className="particle type-1" style={{ width: '9px', height: '9px', top: '70%', left: '40%', animationDelay: '-6s' }}></div>
            <div className="particle type-2" style={{ width: '5px', height: '5px', top: '40%', left: '90%', animationDelay: '-3s' }}></div>
            <div className="particle type-3" style={{ width: '11px', height: '11px', top: '90%', left: '60%', animationDelay: '-5s' }}></div>
            <div className="particle type-4" style={{ width: '4px', height: '4px', top: '10%', left: '30%', animationDelay: '-7s' }}></div>

            {/* Enhanced geometric shapes */}
            <div className="bg-shape shape-1" style={{ width: '120px', height: '120px', top: '10%', left: '5%', animationDelay: '0s' }}></div>
            <div className="bg-shape shape-2" style={{ width: '180px', height: '180px', top: '70%', left: '85%', animationDelay: '-10s' }}></div>
            <div className="bg-shape shape-3" style={{ width: '100px', height: '100px', top: '50%', left: '10%', animationDelay: '-15s' }}></div>
            <div className="bg-shape shape-1" style={{ width: '140px', height: '140px', top: '20%', left: '80%', animationDelay: '-5s' }}></div>
            <div className="bg-shape shape-2" style={{ width: '90px', height: '90px', top: '85%', left: '30%', animationDelay: '-12s' }}></div>
            <div className="bg-shape shape-3" style={{ width: '160px', height: '160px', top: '35%', left: '75%', animationDelay: '-8s' }}></div>

            {/* Enhanced coding symbols floating around */}
            <div className="code-symbol" style={{ top: '15%', left: '25%', animationDelay: '0s' }}>&#123;&#125;</div>
            <div className="code-symbol" style={{ top: '75%', left: '15%', animationDelay: '-2s' }}>&#60;&#47;&#62;</div>
            <div className="code-symbol" style={{ top: '45%', left: '85%', animationDelay: '-4s' }}>&#91;&#93;</div>
            <div className="code-symbol" style={{ top: '85%', left: '75%', animationDelay: '-1s' }}>&#40;&#41;</div>
            <div className="code-symbol" style={{ top: '25%', left: '5%', animationDelay: '-6s' }}>&#43;&#43;</div>
            <div className="code-symbol" style={{ top: '65%', left: '95%', animationDelay: '-3s' }}>&#61;&#62;</div>
            <div className="code-symbol" style={{ top: '35%', left: '35%', animationDelay: '-5s' }}>&#38;&#38;</div>
            <div className="code-symbol" style={{ top: '55%', left: '65%', animationDelay: '-7s' }}>&#124;&#124;</div>
            <div className="code-symbol" style={{ top: '5%', left: '55%', animationDelay: '-8s' }}>&#33;&#61;</div>
            <div className="code-symbol" style={{ top: '95%', left: '45%', animationDelay: '-9s' }}>&#61;&#61;</div>
            <div className="code-symbol" style={{ top: '8%', left: '75%', animationDelay: '-10s' }}>&#45;&#45;</div>
            <div className="code-symbol" style={{ top: '72%', left: '25%', animationDelay: '-11s' }}>&#42;&#47;</div>
            <div className="code-symbol" style={{ top: '18%', left: '85%', animationDelay: '-2.5s' }}>&#47;&#42;</div>
            <div className="code-symbol" style={{ top: '88%', left: '55%', animationDelay: '-1.5s' }}>&#35;&#35;</div>
            <div className="code-symbol" style={{ top: '38%', left: '15%', animationDelay: '-3.5s' }}>&#36;&#36;</div>
            <div className="code-symbol" style={{ top: '58%', left: '5%', animationDelay: '-4.5s' }}>&#126;&#126;</div>
            <div className="code-symbol" style={{ top: '28%', left: '95%', animationDelay: '-6.5s' }}>&#94;&#94;</div>
            <div className="code-symbol" style={{ top: '48%', left: '45%', animationDelay: '-7.5s' }}>&#37;&#37;</div>
            <div className="code-symbol" style={{ top: '68%', left: '35%', animationDelay: '-8.5s' }}>&#64;&#64;</div>
            <div className="code-symbol" style={{ top: '78%', left: '65%', animationDelay: '-9.5s' }}>&#58;&#58;</div>
        </div>
    );
}
