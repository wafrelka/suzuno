const PAGE_KEY = "p";

function get_canonical_list_url(base_url) {
	let url = new URL(base_url);
	url.searchParams.delete(PAGE_KEY);
	if(url.pathname.endsWith("/")) {
		url.pathname = url.pathname.slice(0, -1);
	}
	if(url.pathname === "") {
		url.pathname = "/";
	}
	return url;
}

function get_directory_url(parent_url, name) {
	let safe_name = encodeURIComponent(name);
	let url = get_canonical_list_url(parent_url);
	url.pathname = url.pathname + "/" + safe_name;
	return url;
}

function get_page_url(base_url, page_num) {
	let url = new URL(base_url);
	url.searchParams.set(PAGE_KEY, page_num);
	return url;
}

function get_list_url(base_url) {
	let url = new URL(base_url);
	url.searchParams.delete(PAGE_KEY);
	return url;
}

function pick_page(base_url) {
	let url = new URL(base_url);
	let p_str = url.searchParams.get(PAGE_KEY);
	let p = parseInt(p_str, 10);
	if(isNaN(p)) {
		return null;
	}
	return p;
}

function get_parent_url(base_url) {
	let url = get_canonical_list_url(base_url);
	url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf("/"));
	if(url.pathname.lastIndexOf("/") === 0 && url.pathname !== "/") {
		url.pathname = url.pathname + "/";
	}
	return url;
}

export {
	get_canonical_list_url,
	get_directory_url,
	get_page_url,
	get_list_url,
	get_parent_url,
	pick_page,
};
