const PAGE_KEY = "p";
const SORT_KEY = "s";
const FILTER_KEY = "f";

function make_canonical_list_url(base_url) {

	let url = new URL(base_url);
	url.searchParams.delete(PAGE_KEY);
	url.searchParams.delete(SORT_KEY);
	url.searchParams.delete(FILTER_KEY);

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
	if(second_idx !== -1) {
		let idx = Math.max(second_idx + 1, url.pathname.lastIndexOf("/"));
		url.pathname = url.pathname.slice(0, idx);
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

function get_directory(base_url) {
	let url = make_canonical_list_url(base_url);
	if(url.pathname.endsWith("/")) {
		return null;
	}
	let escaped = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
	return decodeURIComponent(escaped);
}

function is_parent_list(list_url, parent_url) {
	let d = get_directory(list_url);
	let tl = make_canonical_list_url(list_url);
	let pl = make_canonical_list_url(parent_url);
	return d !== null && same_url(tl, make_directory_url(pl, d));
}

function is_parent_page(page_url, parent_url) {
	let tp = get_page(page_url);
	let pp = get_page(parent_url);
	return pp === null && same_url(make_page_url(parent_url, tp), page_url);
}

function is_parent(target_url, parent_url) {
	return is_parent_list(target_url, parent_url) || is_parent_page(target_url, parent_url);
}

function same_url(left, right) {
	return left.href === right.href;
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
	get_directory,
	is_parent_list,
	is_parent_page,
	is_parent,
	same_url,
}
