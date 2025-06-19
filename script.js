document.addEventListener('DOMContentLoaded', () => {
    // Get references to key DOM elements
    const imageContainer = document.querySelector('.image-container');
    const mainMap = document.getElementById('mainMap');
    const zoomButton = document.getElementById('zoomButton');
    const coordsDisplay = document.getElementById('coordsDisplay');
    const overlay = document.getElementById('overlay'); // Overlay for when tooltips are pinned
    const mainTooltip = document.getElementById('mainTooltip'); // First tooltip element (basic info)
    const detailedTooltip = document.getElementById('detailedTooltip'); // Second tooltip element (detailed info)

    let hotspotData = []; // Array to store hotspot data loaded from JSON
    let activeHotspotId = null; // Stores the ID of the currently clicked/pinned hotspot
    let currentHoverHotspotId = null; // Stores the ID of the hotspot currently being hovered (for hover state management)

    // Define available zoom levels in percentage
    const zoomLevels = [30, 50, 100]; 
    // Set default zoom level index to 50% (index 1 in zoomLevels array)
    let currentZoomLevelIndex = 1; 

    /**
     * Updates the text displayed on the zoom button.
     * It cycles through the zoom levels to show what the next click will do.
     */
    function updateZoomButtonText() {
        const nextZoomLevelIndex = (currentZoomLevelIndex + 1) % zoomLevels.length;
        const nextZoomPercent = zoomLevels[nextZoomLevelIndex];
        const currentZoomPercent = zoomLevels[currentZoomLevelIndex];

        if (currentZoomPercent === 100) {
            zoomButton.textContent = `Thu nhỏ về ${nextZoomPercent}%`;
        } else {
            zoomButton.textContent = `Phóng to lên ${nextZoomPercent}%`;
        }
    }

    /**
     * Hides both main and detailed tooltips and the overlay.
     * Resets any active hotspot state. This is the primary function to dismiss tooltips.
     */
    function hideAllTooltips() {
        mainTooltip.classList.remove('visible');
        detailedTooltip.classList.remove('visible');
        overlay.classList.remove('active');
        activeHotspotId = null; // Clear the ID of the currently pinned hotspot
    }

    /**
     * Loads hotspot data from the 'data.json' file.
     * Handles potential fetch errors and displays a user-friendly message.
     */
    async function loadHotspotData() {
        try {
            const response = await fetch('data.json'); // Fetch the JSON data
            if (!response.ok) { // Check if the network response was successful
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            hotspotData = await response.json(); // Parse the JSON data
            console.log('Hotspot data loaded:', hotspotData);
            createHotspots(); // Create hotspots after data is successfully loaded
        } catch (error) {
            console.error('Error loading hotspot data:', error);
            // Display a user-friendly error message
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

        hotspotData.forEach(item => {
            // Create a div element to serve as the hotspot group (contains icon)
            const hotspotGroup = document.createElement('div');
            hotspotGroup.id = item.id;
            hotspotGroup.dataset.hotspotId = item.id; 
            hotspotGroup.className = `hotspot-group absolute flex items-center justify-center 
                                      cursor-pointer transition-transform duration-200 ease-in-out`;
            hotspotGroup.style.width = '40px'; 
            hotspotGroup.style.height = '40px';
            
            // Calculate the absolute pixel position based on percentage coordinates and current map size
            const adjustedX = (item.x_percent / 100) * currentWidth;
            const adjustedY = (item.y_percent / 100) * currentHeight;

            hotspotGroup.style.left = `${adjustedX}px`;
            hotspotGroup.style.top = `${adjustedY}px`;
            hotspotGroup.style.transform = 'translate(-50%, -50%)';

            // Create the dot icon element
            const icon = document.createElement('span');
            icon.className = "icon";
            icon.textContent = "•";

            hotspotGroup.appendChild(icon);
            imageContainer.appendChild(hotspotGroup);

            // --- Event Listeners for Hotspot ---

            // Mouse over listener: Shows main tooltip on hover, unless another hotspot is pinned.
            hotspotGroup.addEventListener('mouseover', (e) => {
                currentHoverHotspotId = item.id; // Mark this hotspot as currently hovered
                // If there's an active (pinned) hotspot and it's different from the one being hovered,
                // then hide all current tooltips (this effectively "unpins" and shows the new hover)
                if (activeHotspotId && activeHotspotId !== item.id) {
                    hideAllTooltips(); 
                }
                // Only show the main tooltip on hover if no hotspot is currently pinned
                if (!activeHotspotId) {
                    mainTooltip.classList.add('visible');
                    // Populate main tooltip content
                    mainTooltip.innerHTML = `
                        <p class="font-bold text-base mb-1">${item.location}</p>
                        <p class="text-xs text-gray-300 mb-1">Tọa độ: ${item.coordinates}</p>
                        <p>${item.description}</p>
                        <p class="text-xs text-blue-300 mt-2">Click để ghim</p>
                    `;
                    // Attach data-hotspot-id to the mainTooltip so its click event knows which hotspot it belongs to
                    mainTooltip.dataset.activeHotspotId = item.id;
                }
            });

            // Mouse leave listener: Hides main tooltip if nothing is pinned.
            hotspotGroup.addEventListener('mouseleave', () => {
                currentHoverHotspotId = null; // Clear hovered hotspot ID
                // If no hotspot is currently pinned, hide the main tooltip
                if (!activeHotspotId) {
                    mainTooltip.classList.remove('visible');
                }
            });

            // Click listener: Pins the tooltip and activates the overlay.
            hotspotGroup.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop click from bubbling up to the body/overlay

                // If the clicked hotspot is already the active (pinned) one, unpin it.
                if (activeHotspotId === item.id) {
                    hideAllTooltips();
                } else { // If a new hotspot is clicked or nothing was pinned
                    hideAllTooltips(); // First, hide any existing tooltips/overlay
                    activeHotspotId = item.id; // Set the new active hotspot
                    
                    // Show the main tooltip and activate the overlay
                    mainTooltip.classList.add('visible');
                    overlay.classList.add('active');

                    // Populate main tooltip content for the pinned state
                    mainTooltip.innerHTML = `
                        <p class="font-bold text-base mb-1">${item.location}</p>
                        <p class="text-xs text-gray-300 mb-1">Tọa độ: ${item.coordinates}</p>
                        <p>${item.description}</p>
                        <p class="text-xs text-blue-300 mt-2">Click để xem chi tiết</p>
                    `;
                    mainTooltip.dataset.activeHotspotId = item.id; // Ensure data attribute is set
                }
            });
        });
    }

    // --- Global Event Listeners ---

    // Click listener for the main tooltip: shows the detailed tooltip.
    mainTooltip.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from propagating to body/overlay
        
        // Find the data for the currently active hotspot
        const hotspotId = mainTooltip.dataset.activeHotspotId;
        const clickedHotspotData = hotspotData.find(h => h.id === hotspotId);

        // If data exists and has a detailed description, populate and show the detailed tooltip
        if (clickedHotspotData && clickedHotspotData.detailed_description) {
            detailedTooltip.querySelector('h3').textContent = clickedHotspotData.location;
            detailedTooltip.querySelector('p:nth-of-type(1)').textContent = `Tọa độ: ${clickedHotspotData.coordinates}`;
            detailedTooltip.querySelector('p:nth-of-type(2)').innerHTML = clickedHotspotData.detailed_description;
            detailedTooltip.classList.add('visible');
        } else {
            console.warn("Detailed description not found for this hotspot or detailed tooltip is already visible.");
        }
    });

    // Click listener on the body/overlay to dismiss tooltips when clicking outside
    document.body.addEventListener('click', (e) => {
        // If there's an active (pinned) hotspot and the click target is outside
        // the main tooltip, detailed tooltip, or any hotspot group.
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
        // Use a slight delay to ensure the browser has finished rendering the new size
        setTimeout(() => { 
            createHotspots();
        }, 550); 
    });

    /**
     * Handles the mousemove event on the map to display real-time coordinates.
     */
    mainMap.addEventListener('mousemove', (event) => {
        const rect = mainMap.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const width = mainMap.offsetWidth;
        const height = mainMap.offsetHeight;

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
            loadHotspotData(); 
            // Automatically click the zoom button once after everything is loaded and set up
            zoomButton.click(); // Added this line
        }, 100); 
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
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log('Window resized, adjusting hotspots...');
            createHotspots(); // Recreate hotspots to update their positions based on new window size
            // Re-hide tooltips if resizing occurs while pinned, to prevent layout issues
            if (activeHotspotId) {
                hideAllTooltips(); 
            }
        }, 250);
    });
});