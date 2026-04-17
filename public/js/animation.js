document.addEventListener("DOMContentLoaded", () => {
    const heroSection = document.querySelector('.hero');
    if (!heroSection) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'hero-canvas';
    heroSection.insertBefore(canvas, heroSection.firstChild);

    const ctx = canvas.getContext('2d');
    
    let width = heroSection.offsetWidth || window.innerWidth;
    let height = heroSection.offsetHeight || window.innerHeight;
    
    console.log(`FestFlow Animation initialized. Canvas dimensions: ${width}x${height}`);
    
    let particlesArray = [];
    let mouse = { x: null, y: null, radius: 120 };

    function setSize() {
        if (heroSection.offsetWidth === 0 || heroSection.offsetHeight === 0) return;
        width = heroSection.offsetWidth;
        height = heroSection.offsetHeight;
        canvas.width = width;
        canvas.height = height;
        init();
    }

    const resizeObserver = new ResizeObserver(() => {
        setSize();
    });
    resizeObserver.observe(heroSection);

    heroSection.addEventListener('mousemove', function(event) {
        let rect = heroSection.getBoundingClientRect();
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
    });

    heroSection.addEventListener('mouseleave', function() {
        mouse.x = null;
        mouse.y = null;
    });
    
    heroSection.addEventListener('click', function(event) {
        let rect = heroSection.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        
        // Add a burst of particles on click
        for(let i=0; i<8; i++) {
             particlesArray.push(new Particle(x, y, true));
        }
    });

    class Particle {
        constructor(x, y, isBurst = false) {
            this.x = x !== undefined ? x : Math.random() * width;
            this.y = y !== undefined ? y : Math.random() * height;
            this.size = Math.random() * 2.5 + 1;
            this.density = (Math.random() * 20) + 1;

            if (isBurst) {
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = (Math.random() - 0.5) * 6;
            } else {
                this.vx = (Math.random() - 0.5) * 1.2;
                this.vy = (Math.random() - 0.5) * 1.2;
            }
        }
        
        draw() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.fillStyle = isDark ? 'rgba(139, 191, 212, 0.8)' : 'rgba(58, 152, 212, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (Math.abs(this.vx) > 1.2 || Math.abs(this.vy) > 1.2) {
                this.vx *= 0.95;
                this.vy *= 0.95;
            }

            if (this.x < 0 || this.x > width) this.vx = -this.vx;
            if (this.y < 0 || this.y > height) this.vy = -this.vy;

            if (mouse.x != null && mouse.y != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    let maxDistance = mouse.radius;
                    let force = (maxDistance - distance) / maxDistance;
                    let directionX = forceDirectionX * force * (this.density * 0.5);
                    let directionY = forceDirectionY * force * (this.density * 0.5);
                    
                    this.x -= directionX;
                    this.y -= directionY;
                }
            }
        }
    }

    function init() {
        particlesArray = [];
        const numberOfParticles = Math.floor((width * height) / 10000);
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
        }
        connect();
        requestAnimationFrame(animate);
    }
    
    function connect() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let dx = particlesArray[a].x - particlesArray[b].x;
                let dy = particlesArray[a].y - particlesArray[b].y;
                let distance = (dx * dx) + (dy * dy);
                
                if (distance < 15000) {
                    let opacityValue = 1 - (distance / 15000);
                    ctx.strokeStyle = isDark ? `rgba(139, 191, 212, ${opacityValue * 0.4})` : `rgba(58, 152, 212, ${opacityValue * 0.4})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    setSize();
    animate();
});
