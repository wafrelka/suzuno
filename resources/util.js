async function fetch_json(url) {
	let resp = await fetch(url);
	if(!resp.ok) {
		throw resp.statusText;
	}
	return resp.json();
}

export { fetch_json }
