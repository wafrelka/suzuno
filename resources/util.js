async function fetch_json(url) {
	let resp = await fetch(url);
	if(!resp.ok) {
		throw resp.statusText;
	}
	return resp.json();
}

function get_friendly_size_text(size) {
	let units = ["", "K", "M", "G", "T"];
	for(let i = 0; i < units.length; i += 1) {
		let single = Math.pow(1000, i);
		if(size >= 1000 * single && i + 1 < units.length) {
			continue;
		}
		return `${(size / single).toFixed(1)} ${units[i]}B`;
	}
}

export { fetch_json, get_friendly_size_text }
