window.TF = (function(){
  const JSON_PATH = './evc_benchmarks.json'; // adjust if needed

  async function loadJSON(){
    const resp = await fetch(JSON_PATH);
    if(!resp.ok) throw new Error('Failed to load evc_benchmarks.json');
    return resp.json();
  }

  async function getEVC(bioregionCode, evcId){
    const data = await loadJSON();
    const bio = data.bioregions.find(b => b.bioregion_code === bioregionCode);
    if(!bio) return null;
    return bio.evcs.find(e => e.evc_id === Number(evcId)) || null;
  }

  async function populateSelectors(bioSel, evcSel){
    const data = await loadJSON();
    const bioEl = typeof bioSel === 'string' ? document.querySelector(bioSel) : bioSel;
    const evcEl = typeof evcSel === 'string' ? document.querySelector(evcSel) : evcSel;

    // Populate bioregions
    bioEl.innerHTML = '';
    data.bioregions.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.bioregion_code; opt.textContent = `${b.bioregion_code} — ${b.bioregion_name}`;
      bioEl.appendChild(opt);
    });

    // When bioregion changes, repopulate EVCs
    function fillEVCs(){
      const b = data.bioregions.find(x => x.bioregion_code === bioEl.value);
      evcEl.innerHTML = '';
      if(!b){ return; }
      // sort by numeric evc_id
      [...b.evcs].sort((a,b)=>a.evc_id-b.evc_id).forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.evc_id; opt.textContent = `${e.evc_id} — ${e.evc_name}`;
        evcEl.appendChild(opt);
      });
    }

    bioEl.addEventListener('change', fillEVCs);
    fillEVCs();

    return { bio: bioEl, evc: evcEl };
  }

  function renderEVC(evc, mount){
    const el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if(!evc){ el.innerHTML = '<p>No data found for this selection.</p>'; return; }

    const groupOrder = [
      ['canopy','Canopy (Trees)'],
      ['shrub','Shrub Layer'],
      ['climber','Climbers'],
      ['grass-sedge','Grasses & Sedges'],
      ['fern','Ferns'],
      ['groundlayer','Groundlayer (Herbs, Lilies, Bryophytes)'],
      ['other','Other']
    ];

    const html = [];
    html.push(`<h3>EVC ${evc.evc_id}: ${evc.evc_name}</h3>`);
    if(evc.description) html.push(`<p>${evc.description}</p>`);

    const grouped = evc.grouped || {};
    groupOrder.forEach(([key,label]) => {
      const items = grouped[key] || [];
      if(!items.length) return;
      const lis = items.map(s => `
        <li>[${s.life_form_label || s.life_form}] <em>${s.scientific_name}</em>${s.common_name ? ' — ' + s.common_name : ''}</li>
      `).join('');
      html.push(`<h4>${label}</h4><ul>${lis}</ul>`);
    });

    el.innerHTML = html.join('');
  }

  return { getEVC, renderEVC, populateSelectors };
})();
