async function fetch_json(url, controller = undefined) {
	let opt = {};
	if(controller !== undefined) {
		opt.signal = controller.signal;
	}
	let resp = await fetch(url, opt);
	if(!resp.ok) {
		throw resp.statusText;
	}
	return resp.json();
}

function get_friendly_size_text(size) {
	let units = ["", "K", "M", "G", "T"];
	for(let i = 0, base = 1; i < units.length; i += 1, base = base * 1000) {
		if(size >= 1000 * base && i + 1 < units.length) {
			continue;
		}
		return `${(size / base).toFixed(1)} ${units[i]}B`;
	}
}

export { fetch_json, get_friendly_size_text }
