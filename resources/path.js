const PAGE_KEY = "p";
const SORT_KEY = "s";
const FILTER_KEY = "f";

function make_canonical_list_url(base_url) {

	let url = new URL(base_url);
	url.searchParams.delete(PAGE_KEY);
	url.searchParams.delete(SORT_KEY);

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

function make_sorted_url(base_url, sort_key) {
	let url = new URL(base_url);
	url.searchParams.set(SORT_KEY, sort_key);
	return url;
}

function make_filtered_url(base_url, text) {
	let url = new URL(base_url);
	if(text === null || text === "") {
		url.searchParams.delete(FILTER_KEY);
		return url;
	}
	url.searchParams.set(FILTER_KEY, text);
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

function get_sort_key(base_url) {
	let url = new URL(base_url);
	let s_str = url.searchParams.get(SORT_KEY);
	if(s_str === "") {
		return null;
	}
	return s_str;
}

function get_filter_text(base_url) {
	let url = new URL(base_url);
	let f_str = url.searchParams.get(FILTER_KEY);
	if(f_str === "") {
		return null;
	}
	return f_str;
}

export {
	make_canonical_list_url,
	make_directory_url,
	make_page_url,
	make_list_url,
	make_parent_url,
	make_sorted_url,
	make_filtered_url,
	get_page,
	get_sort_key,
	get_filter_text,
}
