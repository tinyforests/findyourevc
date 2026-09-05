const CONFIG = {
    NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
    VIC_WFS_URL: 'https://opendata.maps.vic.gov.au/geoserver/wfs',
    // Pre-1750 modelled EVC (what NatureKit shows) — full statewide coverage, so
    // exact point-in-polygon always resolves the site's original ecological
    // community. NV2005 is the *extant* layer and is empty over cleared suburban
    // lots, forcing a fallback guess that does not match NatureKit.
    EVC_LAYER: 'open-data-platform:nv1750_evcbcs'
};
