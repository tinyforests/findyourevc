document.addEventListener('DOMContentLoaded', function() {
    console.log('EVC Fetch script loaded');
    
    var addressInput = document.getElementById('address');
    var searchBtn = document.getElementById('searchBtn');
    var locationBtn = document.getElementById('locationBtn');
    var autocompleteResults = document.getElementById('autocompleteResults');
    var resultsModal = document.getElementById('resultsModal');
    var modalClose = document.getElementById('modalClose');

    var selectedLocation = null;
    var autocompleteTimeout = null;

    console.log('Elements found:', {
        addressInput: !!addressInput,
        searchBtn: !!searchBtn,
        locationBtn: !!locationBtn,
        autocompleteResults: !!autocompleteResults,
        resultsModal: !!resultsModal
    });

    if (addressInput) {
        addressInput.addEventListener('input', function(e) {
            clearTimeout(autocompleteTimeout);
            var query = e.target.value.trim();

            if (query.length < 3) {
                autocompleteResults.classList.remove('active');
                autocompleteResults.innerHTML = '';
                return;
            }

            autocompleteTimeout = setTimeout(function() {
                fetchAutocomplete(query);
            }, 300);
        });
    }

    function fetchAutocomplete(query) {
        console.log('Fetching autocomplete for:', query);
        var url = CONFIG.NOMINATIM_URL + '/search?' + new URLSearchParams({
            q: query + ', Victoria, Australia',
            format: 'json',
            addressdetails: 1,
            limit: 8,
            countrycodes: 'au'
        });

        console.log('Autocomplete URL:', url);
        fetch(url)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                console.log('Autocomplete response:', data);
                var filtered = data.filter(function(item) {
                    var addr = item.address || {};
                    var hasHouseNumber = addr.state === 'Victoria' && addr.house_number;
                    var notCommercial = true;
                    if (item.type) {
                        notCommercial = !item.type.match(/amenity|shop|office|tourism/);
                    }
                    return hasHouseNumber && notCommercial;
                });
                console.log('Filtered results:', filtered.length);
                displayAutocomplete(filtered);
            })
            .catch(function(error) {
                console.error('Autocomplete error:', error);
            });
    }

    function displayAutocomplete(results) {
        if (results.length === 0) {
            autocompleteResults.classList.remove('active');
            autocompleteResults.innerHTML = '';
            return;
        }

        var html = '';
        for (var i = 0; i < results.length; i++) {
            var item = results[i];
            var addr = item.address;
            var parts = [];
            if (addr.house_number) parts.push(addr.house_number);
            if (addr.road) parts.push(addr.road);
            if (addr.suburb) parts.push(addr.suburb);
            else if (addr.city) parts.push(addr.city);
            else if (addr.town) parts.push(addr.town);
            parts.push('VIC');
            var display = parts.join(', ');

            html += '<div class="autocomplete-item" data-lat="' + item.lat + '" data-lon="' + item.lon + '" data-display="' + display + '">' + display + '</div>';
        }

        autocompleteResults.innerHTML = html;
        autocompleteResults.classList.add('active');

        var items = autocompleteResults.querySelectorAll('.autocomplete-item');
        for (var i = 0; i < items.length; i++) {
            items[i].addEventListener('click', function() {
                selectedLocation = {
                    lat: parseFloat(this.dataset.lat),
                    lon: parseFloat(this.dataset.lon),
                    display: this.dataset.display
                };
                console.log('Selected location:', selectedLocation);
                addressInput.value = this.dataset.display;
                autocompleteResults.classList.remove('active');
                autocompleteResults.innerHTML = '';
            });
        }
    }

    document.addEventListener('click', function(e) {
        if (addressInput && !addressInput.contains(e.target) && autocompleteResults && !autocompleteResults.contains(e.target)) {
            autocompleteResults.classList.remove('active');
        }
    });

    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            console.log('Search button clicked');
            console.log('Selected location:', selectedLocation);
            
            if (!selectedLocation) {
                var query = addressInput.value.trim();
                if (!query) {
                    showError('Please enter an address');
                    return;
                }
                geocodeAndSearch(query);
            } else {
                searchEVC(selectedLocation.lat, selectedLocation.lon, selectedLocation.display);
            }
        });
    }

    if (locationBtn) {
        locationBtn.addEventListener('click', function() {
            console.log('Location button clicked');
            if ('geolocation' in navigator) {
                locationBtn.textContent = 'Getting location...';
                locationBtn.disabled = true;

                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        var lat = position.coords.latitude;
                        var lon = position.coords.longitude;
                        console.log('Got coordinates:', lat, lon);

                        var url = CONFIG.NOMINATIM_URL + '/reverse?' + new URLSearchParams({
                            lat: lat,
                            lon: lon,
                            format: 'json',
                            addressdetails: 1
                        });

                        console.log('Reverse geocode URL:', url);
                        fetch(url)
                            .then(function(response) { return response.json(); })
                            .then(function(data) {
                                console.log('Reverse geocode response:', data);
                                if (data.address && data.address.state !== 'Victoria') {
                                    showError('This tool is limited to Victorian addresses');
                                    locationBtn.textContent = '📍 Use current location';
                                    locationBtn.disabled = false;
                                    return;
                                }

                                var parts = [];
                                if (data.address) {
                                    if (data.address.house_number) parts.push(data.address.house_number);
                                    if (data.address.road) parts.push(data.address.road);
                                    if (data.address.suburb) parts.push(data.address.suburb);
                                    else if (data.address.city) parts.push(data.address.city);
                                    parts.push('VIC');
                                }
                                var display = parts.length > 0 ? parts.join(', ') : 'Current Location';

                                searchEVC(lat, lon, display);
                                locationBtn.textContent = '📍 Use current location';
                                locationBtn.disabled = false;
                            })
                            .catch(function(error) {
                                console.error('Reverse geocoding error:', error);
                                showError('Unable to determine location address');
                                locationBtn.textContent = '📍 Use current location';
                                locationBtn.disabled = false;
                            });
                    },
                    function(error) {
                        console.error('Geolocation error:', error);
                        showError('Unable to access location. Please enter an address instead.');
                        locationBtn.textContent = '📍 Use current location';
                        locationBtn.disabled = false;
                    }
                );
            } else {
                showError('Geolocation is not supported by your browser');
            }
        });
    }

    function geocodeAndSearch(query) {
        console.log('Geocoding:', query);
        var url = CONFIG.NOMINATIM_URL + '/search?' + new URLSearchParams({
            q: query + ', Victoria, Australia',
            format: 'json',
            addressdetails: 1,
            limit: 1
        });

        console.log('Geocode URL:', url);
        fetch(url)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                console.log('Geocode response:', data);
                if (data.length === 0) {
                    showError('Address not found. Please try a different address.');
                    return;
                }

                var result = data[0];
                if (result.address && result.address.state !== 'Victoria') {
                    showError('This tool is limited to Victorian addresses');
                    return;
                }

                searchEVC(parseFloat(result.lat), parseFloat(result.lon), query);
            })
            .catch(function(error) {
                console.error('Geocoding error:', error);
                showError('Unable to find address. Please try again.');
            });
    }

    function searchEVC(lat, lon, address) {
        console.log('Searching EVC for:', lat, lon, address);
        
        // Store coordinates globally for reporting
        window.currentLat = lat;
        window.currentLon = lon;
        
        var steps = document.querySelectorAll('.step');
        for (var i = 0; i < steps.length; i++) {
            if (i < 2) steps[i].classList.add('active');
        }

        showModal('<div class="loading-spinner"></div>');

        var d = 0.02;
        var bbox = [
            lon - d,
            lat - d,
            lon + d,
            lat + d
        ].join(',') + ',EPSG:4326';

        var wfsUrl = CONFIG.VIC_WFS_URL + '?' + new URLSearchParams({
            service: 'WFS',
            version: '1.0.0',
            request: 'GetFeature',
            typeName: CONFIG.EVC_LAYER,
            bbox: bbox,
            outputFormat: 'application/json'
        });

        console.log('WFS URL:', wfsUrl);
        fetch(wfsUrl)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                console.log('WFS response:', data);
                console.log('Number of features:', data.features ? data.features.length : 0);

                if (!data.features || data.features.length === 0) {
                    showError('No EVC data found for this location.');
                    return;
                }

                var point = turf.point([lon, lat]);
                var matchedFeature = null;

                console.log('=== Checking for point-in-polygon matches ===');
                console.log('Point coordinates: [' + lon + ', ' + lat + ']');

                // Check Polygons first
                for (var i = 0; i < data.features.length; i++) {
                    var f = data.features[i];
                    if (f.geometry.type === 'Polygon') {
                        try {
                            var poly = turf.polygon(f.geometry.coordinates);
                            if (turf.booleanPointInPolygon(point, poly)) {
                                console.log('✓ EXACT MATCH - Feature ' + i + ':', f.properties.x_evcname, 'EVC', f.properties.evc);
                                matchedFeature = f;
                                break;
                            }
                        } catch (e) {
                            console.log('Error checking polygon', i, ':', e.message);
                        }
                    }
                }

                // Try MultiPolygons if no Polygon match
                if (!matchedFeature) {
                    for (var i = 0; i < data.features.length; i++) {
                        var f = data.features[i];
                        if (f.geometry.type === 'MultiPolygon') {
                            try {
                                for (var j = 0; j < f.geometry.coordinates.length; j++) {
                                    var poly = turf.polygon(f.geometry.coordinates[j]);
                                    if (turf.booleanPointInPolygon(point, poly)) {
                                        console.log('✓ EXACT MATCH - Feature ' + i + ' (MultiPolygon):', f.properties.x_evcname, 'EVC', f.properties.evc);
                                        matchedFeature = f;
                                        break;
                                    }
                                }
                                if (matchedFeature) break;
                            } catch (e) {
                                console.log('Error checking MultiPolygon', i, ':', e.message);
                            }
                        }
                    }
                }

                // If no exact match, find closest polygon
                if (!matchedFeature) {
                    console.log('⚠ No exact match found - finding closest polygon');
                    var closestDist = Infinity;
                    var closestFeature = null;

                    for (var i = 0; i < data.features.length; i++) {
                        var f = data.features[i];
                        try {
                            var featureGeom = f.geometry.type === 'Polygon' ? 
                                turf.polygon(f.geometry.coordinates) : 
                                turf.multiPolygon(f.geometry.coordinates);
                            var dist = turf.distance(point, turf.centroid(featureGeom));
                            
                            console.log('  Feature ' + i + ' (' + f.properties.x_evcname + ' EVC ' + f.properties.evc + '): distance = ' + dist.toFixed(3) + ' km');
                            
                            if (dist < closestDist) {
                                closestDist = dist;
                                closestFeature = f;
                            }
                        } catch (e) {
                            console.log('  Error calculating distance for feature', i, ':', e.message);
                        }
                    }

                    if (closestFeature) {
                        console.log('→ CLOSEST FEATURE (distance: ' + closestDist.toFixed(3) + ' km):', 
                            closestFeature.properties.x_evcname, 'EVC', closestFeature.properties.evc);
                        matchedFeature = closestFeature;
                    } else {
                        console.log('→ Fallback to first feature');
                        matchedFeature = data.features[0];
                    }
                }

                displayResults(matchedFeature, address);

                var allSteps = document.querySelectorAll('.step');
                for (var i = 0; i < allSteps.length; i++) {
                    allSteps[i].classList.add('active');
                }
            })
            .catch(function(error) {
                console.error('EVC fetch error:', error);
                showError('Unable to retrieve EVC data. Error: ' + error.message);
            });
    }

    function displayResults(feature, address) {
        console.log('Displaying results for feature:', feature);
        
        var props = feature.properties;
        console.log('Feature properties:', props);
        
        var evcName = props.x_evcname || props.evc_name || props.X_EVCNAME || 'Unknown';
        var evcCode = props.evc || props.evc_no || props.EVC || '';
        var bioregion = props.bioregion || props.bioregion_name || props.BIOREGION || 'Not specified';
        var status = props.evc_bcs_desc || props.bcs_description || props.EVC_BCS_DESC || 'Status not available';
        
        // Store for reporting
        window.currentResult = {
            address: address,
            lat: window.currentLat || 0,
            lon: window.currentLon || 0,
            evc: evcCode,
            evcName: evcName,
            bioregion: bioregion,
            status: status
        };

        var html = '<div class="result-header">' +
            '<h2>EVC ' + evcCode + ' — ' + evcName + '</h2>' +
            '<div class="result-address">' + address + '</div>' +
            '</div>' +
            '<div class="result-details">' +
            '<div class="result-item">' +
            '<div class="result-item-label">Bioregion</div>' +
            '<div class="result-item-value">' + bioregion + '</div>' +
            '</div>' +
            '<div class="result-item">' +
            '<div class="result-item-label">Conservation Status</div>' +
            '<div class="result-item-value">' + status + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="result-disclaimer">' +
            'EVC classifications are derived from state spatial datasets and represent approximate pre-1750 vegetation patterns. Results may differ from Nature Kit or site assessments due to boundary gaps and data resolution.<br><br>' +
            'For planning, compliance, or precise determination, verify via Nature Kit or consult a qualified ecologist.' +
            '</div>' +
            '<div class="result-actions">' +
            '<a href="https://www.environment.vic.gov.au/biodiversity/nature-kit" target="_blank" rel="noopener" class="btn-verify">' +
            'Verify with Nature Kit →' +
            '</a>' +
            '<a href="https://www.findmyecologicalgarden.com/?evc=' + evcCode + '&name=' + encodeURIComponent(evcName) + '" target="_blank" rel="noopener" class="btn-secondary-action">' +
            'View indigenous plant species →' +
            '</a>' +
            '<button onclick="reportMismatch()" class="btn-report">' +
            'Report mismatch' +
            '</button>' +
            '</div>';

        showModal(html);
    }

    // Make reportMismatch globally accessible
    window.reportMismatch = function() {
        var result = window.currentResult;
        if (!result) return;
        
        var subject = encodeURIComponent('EVC Lookup Mismatch Report');
        var body = encodeURIComponent(
            'Address: ' + result.address + '\n' +
            'Coordinates: ' + result.lat + ', ' + result.lon + '\n' +
            'Find My EVC Result: EVC ' + result.evc + ' — ' + result.evcName + '\n' +
            'Bioregion: ' + result.bioregion + '\n' +
            'Conservation Status: ' + result.status + '\n\n' +
            'Nature Kit Result (please fill in):\n' +
            'EVC Code: \n' +
            'EVC Name: \n\n' +
            'Additional notes:\n'
        );
        
        window.location.href = 'mailto:hello@gardenerandson.com.au?subject=' + subject + '&body=' + body;
    };

    function showModal(content) {
        if (!resultsModal) return;
        document.getElementById('resultsContent').innerHTML = content;
        resultsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function showError(message) {
        console.error('Showing error:', message);
        var html = '<div class="error-message">' + message + '</div>';
        showModal(html);
    }

    if (modalClose) {
        modalClose.addEventListener('click', function() {
            resultsModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (resultsModal) {
        resultsModal.addEventListener('click', function(e) {
            if (e.target === resultsModal) {
                resultsModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});
