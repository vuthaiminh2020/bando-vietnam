document.addEventListener('DOMContentLoaded', () => {
    // Get references to key DOM elements
    const imageContainer = document.querySelector('.image-container');
    const mainMap = document.getElementById('mainMap');
    const zoomButton = document.getElementById('zoomButton');
    const coordsDisplay = document.getElementById('coordsDisplay');
    const overlay = document.getElementById('overlay'); // Overlay for when tooltips are pinned
    const mainTooltip = document.getElementById('mainTooltip'); // First tooltip element
    const detailedTooltip = document.getElementById('detailedTooltip'); // Second tooltip element

    let hotspotData = []; // Array to store hotspot data loaded from JSON
    let activeHotspotId = null; // Stores the ID of the currently clicked/pinned hotspot
    let currentHoverHotspotId = null; // Stores the ID of the hotspot currently being hovered

    // Define available zoom levels in percentage
    const zoomLevels = [30, 50, 100]; 
    // Set default zoom level index to 50% (index 1 in zoomLevels array)
    let currentZoomLevelIndex = 1; 

    /**
     * Updates the text displayed on the zoom button.
     * It cycles through the zoom levels to show what the next click will do.
     */
    function updateZoomButtonText() {
        // Calculate the index of the next zoom level in the cycle
        const nextZoomLevelIndex = (currentZoomLevelIndex + 1) % zoomLevels.length;
        const nextZoomPercent = zoomLevels[nextZoomLevelIndex]; // The next zoom percentage
        const currentZoomPercent = zoomLevels[currentZoomLevelIndex]; // The current zoom percentage

        // Update button text based on whether current zoom is 100% or not
        if (currentZoomPercent === 100) {
            zoomButton.textContent = `Thu nhỏ về ${nextZoomPercent}%`;
        } else {
            zoomButton.textContent = `Phóng to lên ${nextZoomPercent}%`;
        }
    }

    /**
     * Hides both main and detailed tooltips and the overlay.
     * Resets any active hotspot state.
     */
    function hideAllTooltips() {
        mainTooltip.classList.remove('visible');
        detailedTooltip.classList.remove('visible');
        overlay.classList.remove('active');
        activeHotspotId = null; // Clear active hotspot
    }

    /**
     * Loads hotspot data from the 'data.json' file.
     * Handles potential fetch errors and displays a user-friendly message.
     */
    async function loadHotspotData() {
        try {
            const response = await fetch('https://drive.google.com/file/d/1dVpowkUAnDvhaE1Js6E8rA11eFHxRORb/view?usp=sharing'); // Fetch the JSON data
            if (!response.ok) { // Check if the network response was successful
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            hotspotData = await response.json(); // Parse the JSON data
            console.log('Hotspot data loaded:', hotspotData);
            createHotspots(); // Create hotspots after data is successfully loaded
        } catch (error) {
            console.error('Error loading hotspot data:', error);
            // Create and append an error message to the image container
            const errorMessage = document.createElement('div');
            errorMessage.className = "text-red-600 font-semibold p-4 bg-red-100 rounded-lg mt-4";
            errorMessage.textContent = "Không thể tải dữ liệu điểm nóng. Vui lòng kiểm tra lại file data.json.";
            imageContainer.appendChild(errorMessage);
        }
    }

    /**
     * Creates and appends hotspot elements and their corresponding tooltips to the image container.
     * Hotspot positions are calculated dynamically based on percentage coordinates and current map size.
     */
    function createHotspots() {
        // Remove any existing hotspots to prevent duplicates when recreating
        document.querySelectorAll('.hotspot-group').forEach(el => el.remove());

        // Get the current rendered width and height of the main map image
        const currentWidth = mainMap.offsetWidth;
        const currentHeight = mainMap.offsetHeight;

        if (hotspotData.length === 0) {
            console.log('No hotspot data to display.');
            return;
        }

        // Iterate over each item in the hotspotData array
        hotspotData.forEach(item => {
            // Create a div element to serve as the hotspot group (contains icon)
            const hotspotGroup = document.createElement('div');
            hotspotGroup.id = item.id; // Assign a unique ID from data
            // Add a data attribute to store the hotspot ID, useful for event delegation
            hotspotGroup.dataset.hotspotId = item.id; 
            // Apply Tailwind CSS classes for basic styling, positioning, and hover effects
            hotspotGroup.className = `hotspot-group absolute flex items-center justify-center 
                                      cursor-pointer transition-transform duration-200 ease-in-out`;
            hotspotGroup.style.width = '40px'; 
            hotspotGroup.style.height = '40px';
            
            // Calculate the absolute pixel position based on percentage coordinates and current map size
            const adjustedX = (item.x_percent / 100) * currentWidth;
            const adjustedY = (item.y_percent / 100) * currentHeight;

            // Apply calculated positions
            hotspotGroup.style.left = `${adjustedX}px`;
            hotspotGroup.style.top = `${adjustedY}px`;
            // Center the hotspot element precisely on the calculated (x, y) coordinate
            hotspotGroup.style.transform = 'translate(-50%, -50%)';

            // Create the dot icon element
            const icon = document.createElement('span');
            icon.className = "icon"; // Use custom CSS for icon
            icon.textContent = "•"; // The dot character

            // Append icon to the hotspot group
            hotspotGroup.appendChild(icon);
            // Append the complete hotspot group to the image container
            imageContainer.appendChild(hotspotGroup);

            // --- Event Listeners for Hotspot ---

            // Mouse over listener for showing the first tooltip (if not pinned)
            hotspotGroup.addEventListener('mouseover', (e) => {
                currentHoverHotspotId = item.id; // Track which hotspot is currently hovered
                // If there's an active (pinned) hotspot and it's different from the current one, hide all
                if (activeHotspotId && activeHotspotId !== item.id) {
                    hideAllTooltips();
                }
                // If no hotspot is pinned, show the current hotspot's main tooltip
                if (!activeHotspotId) {
                    mainTooltip.classList.add('visible');
                    // Populate main tooltip content
                    mainTooltip.innerHTML = `
                        <p class="font-bold text-base mb-1">${item.location}</p>
                        <p class="text-xs text-gray-300 mb-1">Tọa độ: ${item.coordinates}</p>
                        <p>${item.description}</p>
                    `;
                }
            });

            // Mouse leave listener for hiding the first tooltip (if not pinned)
            hotspotGroup.addEventListener('mouseleave', () => {
                currentHoverHotspotId = null; // No hotspot is currently hovered
                // If no hotspot is active (pinned), hide the main tooltip
                if (!activeHotspotId) {
                    mainTooltip.classList.remove('visible');
                }
            });

            // Click listener for pinning the tooltip
            hotspotGroup.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from propagating to body

                // If this hotspot is already pinned, unpin it
                if (activeHotspotId === item.id) {
                    hideAllTooltips();
                } else { // Clicked a new hotspot or clicked for the first time
                    hideAllTooltips(); // Hide any previously active tooltips
                    activeHotspotId = item.id; // Set this hotspot as active

                    // Show the main tooltip and activate the overlay
                    mainTooltip.classList.add('visible');
                    overlay.classList.add('active');

                    // Populate main tooltip content
                    mainTooltip.innerHTML = `
                        <p class="font-bold text-base mb-1">${item.location}</p>
                        <p class="text-xs text-gray-300 mb-1">Tọa độ: ${item.coordinates}</p>
                        <p>${item.description}</p>
                        <p class="text-xs text-blue-300 mt-2">Click để xem chi tiết</p>
                    `;
                    // Add a data attribute to the mainTooltip itself to link to the active hotspot
                    mainTooltip.dataset.activeHotspotId = item.id;
                }
            });
        });
    }

    // --- Global Event Listeners ---

    // Click listener for the main tooltip to show the detailed tooltip
    mainTooltip.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from propagating to body
        
        const hotspotId = mainTooltip.dataset.activeHotspotId;
        const clickedHotspotData = hotspotData.find(h => h.id === hotspotId);

        if (clickedHotspotData && clickedHotspotData.detailed_description) {
            // Populate detailed tooltip content
            detailedTooltip.querySelector('h3').textContent = clickedHotspotData.location;
            detailedTooltip.querySelector('p:nth-of-type(1)').textContent = `Tọa độ: ${clickedHotspotData.coordinates}`;
            detailedTooltip.querySelector('p:nth-of-type(2)').innerHTML = clickedHotspotData.detailed_description;
            detailedTooltip.classList.add('visible'); // Show detailed tooltip
        } else {
            console.warn("Detailed description not found or already visible.");
        }
    });

    // Click listener on the body to hide all tooltips if clicked outside them
    document.body.addEventListener('click', (e) => {
        // If there's an active hotspot, and the click target is NOT the main tooltip, detailed tooltip, or any hotspot group
        if (activeHotspotId && 
            !mainTooltip.contains(e.target) && 
            !detailedTooltip.contains(e.target) &&
            !e.target.closest('.hotspot-group')
        ) {
            hideAllTooltips();
        }
    });


    /**
     * Handles the click event on the zoom button.
     * Cycles through predefined zoom levels and updates the map's display size.
     */
    zoomButton.addEventListener('click', () => {
        currentZoomLevelIndex = (currentZoomLevelIndex + 1) % zoomLevels.length;
        const newZoomPercent = zoomLevels[currentZoomLevelIndex];
        
        imageContainer.style.maxWidth = `${newZoomPercent}%`;
        
        updateZoomButtonText(); // Update button text
        
        // Recalculate hotspots immediately after container size changes
        setTimeout(() => { // Use setTimeout to ensure the browser has re-rendered the new size
            createHotspots();
        }, 550); // Greater than the transition-duration of .image-container in CSS
    });

    /**
     * Handles the mousemove event on the map to display real-time coordinates.
     */
    mainMap.addEventListener('mousemove', (event) => {
        // Get the bounding rectangle of the map image to calculate relative mouse position
        const rect = mainMap.getBoundingClientRect();
        // Calculate mouse position relative to the top-left of the image
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Get the current rendered width and height of the map image
        const width = mainMap.offsetWidth;
        const height = mainMap.offsetHeight;

        // Calculate percentage coordinates (rounded to 2 decimal places)
        const xPercent = ((x / width) * 100).toFixed(2);
        const yPercent = ((y / height) * 100).toFixed(2);

        coordsDisplay.textContent = `X: ${xPercent}%, Y: ${yPercent}%`;
    });

    /**
     * Handles the mouseleave event from the map to reset the coordinate display text.
     */
    mainMap.addEventListener('mouseleave', () => {
        coordsDisplay.textContent = "Di chuyển chuột trên bản đồ để lấy tọa độ";
    });

    // Initial setup when the map image finishes loading
    mainMap.onload = () => {
        console.log('Map loaded. Starting to load hotspot data.');
        // Set the initial max-width of the image container based on the default zoom level
        imageContainer.style.maxWidth = `${zoomLevels[currentZoomLevelIndex]}%`;
        updateZoomButtonText(); // Update the zoom button text for the initial state
        
        // Add a small delay to allow the browser to fully render the initial max-width
        // before proceeding to load and create hotspots. This fixes the initial positioning issue.
        setTimeout(() => { 
            loadHotspotData(); // Load hotspot data and create hotspots
        }, 100); // A small delay like 100ms should generally be sufficient
    };

    // Handle cases where the image might already be loaded from the browser's cache.
    // If it's complete, manually trigger the onload logic.
    if (mainMap.complete) {
        mainMap.onload();
    }

    // Listen for window resize events to adjust hotspot positions dynamically.
    // Debounce the resize event to avoid excessive calculations during continuous resizing.
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout); // Clear any existing timeout
        resizeTimeout = setTimeout(() => { // Set a new timeout
            console.log('Window resized, adjusting hotspots...');
            createHotspots(); // Recreate hotspots to update their positions based on new window size
            // Re-hide tooltips if resizing occurs while pinned, to prevent layout issues
            if (activeHotspotId) {
                hideAllTooltips(); 
            }
        }, 250); // Wait 250ms after resizing stops before executing
    });
});
