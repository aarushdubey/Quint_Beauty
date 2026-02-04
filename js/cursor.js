/**
 * Quint Beauty - Premium Custom Cursor & Magnetic Buttons
 * Adds a luxurious fluid cursor and magnetic effect to interactive elements.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if device works with hover (don't run on touch devices)
    if (!window.matchMedia('(hover: hover)').matches) {
        return;
    }

    const body = document.body;
    body.classList.add('custom-cursor-enabled');

    // Create Cursor Elements
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';

    const cursorOutline = document.createElement('div');
    cursorOutline.className = 'cursor-outline';

    body.appendChild(cursorDot);
    body.appendChild(cursorOutline);

    // State
    let mouseX = 0;
    let mouseY = 0;
    let outlineX = 0;
    let outlineY = 0;

    // Movement Logic
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Instant movement for the dot
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;

        // Ensure cursor is visible
        if (cursorDot.style.opacity === '0') {
            cursorDot.style.opacity = '1';
            cursorOutline.style.opacity = '1';
        }
    });

    // Smooth follow for the outline
    const animateOutline = () => {
        // Linear Interpolation (Lerp) for smoothness
        // The lower the 0.15 value, the "heavier"/slower the cursor feels
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;

        cursorOutline.style.left = `${outlineX}px`;
        cursorOutline.style.top = `${outlineY}px`;

        requestAnimationFrame(animateOutline);
    };
    animateOutline();

    // Hover State Logic
    // We select all interactive elements
    const interactiveElements = document.querySelectorAll(
        'a, button, input, textarea, .btn, .product-card, .hover-scale'
    );

    interactiveElements.forEach(el => {
        // Mouse Enter
        el.addEventListener('mouseenter', () => {
            cursorOutline.classList.add('hovering');
            cursorDot.classList.add('hovering');
        });

        // Mouse Leave
        el.addEventListener('mouseleave', () => {
            cursorOutline.classList.remove('hovering');
            cursorDot.classList.remove('hovering');

            // Reset magnetic effect if applied
            if (el.classList.contains('magnetic-btn')) {
                el.style.transform = `translate(0px, 0px)`;
            }
        });

        // Magnetic Effect for Buttons
        if (el.classList.contains('btn') || el.classList.contains('mobile-menu-btn')) {
            el.classList.add('magnetic-btn');

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const btnCenterX = rect.left + rect.width / 2;
                const btnCenterY = rect.top + rect.height / 2;

                // Calculate distance from center
                const distX = (e.clientX - btnCenterX) * 0.3; // 0.3 is the magnetic strength
                const distY = (e.clientY - btnCenterY) * 0.3;

                // Move button towards mouse
                el.style.transform = `translate(${distX}px, ${distY}px)`;

                // Also move the text/content slightly more for parallax (optional, keeping simple for now)
            });
        }
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseout', (e) => {
        if (!e.relatedTarget && !e.toElement) {
            cursorDot.style.opacity = '0';
            cursorOutline.style.opacity = '0';
        }
    });
});
