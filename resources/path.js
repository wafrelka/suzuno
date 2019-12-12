const PAGE_KEY = "p";

function make_canonical_list_url(base_url) {

	let url = new URL(base_url);
	url.searchParams.delete(PAGE_KEY);

	if(url.pathname.endsWith("/")) {
		url.pathname = url.pathname.slice(0, -1);
	}
	if(url.pathname.indexOf("/", 1) === -1) {
		url.pathname = url.pathname + "/";
	}

	return url;
}

function make_directory_url(parent_url, name) {
	let safe_name = encodeURIComponent(name);
	let url = make_canonical_list_url(parent_url);
	if(!url.pathname.endsWith("/")) {
		url.pathname = url.pathname + "/";
	}
	url.pathname = url.pathname + safe_name;
	return url;
}

function make_page_url(base_url, page_num) {
	let url = new URL(base_url);
	url.searchParams.set(PAGE_KEY, page_num);
	return url;
}

function make_list_url(base_url) {
	let url = new URL(base_url);
	url.searchParams.delete(PAGE_KEY);
	return url;
}

function make_parent_url(base_url) {
	let url = make_canonical_list_url(base_url);
	let second_idx = url.pathname.indexOf("/", 1);
	if(second_idx !== -1 && second_idx !== url.pathname.length - 1) {
		url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf("/"));
	}
	return url;
}

function get_page(base_url) {
	let url = new URL(base_url);
	let p_str = url.searchParams.get(PAGE_KEY);
	let p = parseInt(p_str, 10);
	if(isNaN(p)) {
		return null;
	}
	return p;
}

export {
	make_canonical_list_url,
	make_directory_url,
	make_page_url,
	make_list_url,
	make_parent_url,
	get_page,
}
