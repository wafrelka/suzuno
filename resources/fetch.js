
import { fetch_json } from "./util.js";
import { make_canonical_list_url } from "./path.js";

function fetch_resources(url) {

	let url_path = make_canonical_list_url(url).pathname;

	if(url_path.startsWith("/view/")) {
		let res_path = url_path.replace(/^\/view/, "");
		return fetch_json(`/meta/directory${res_path}`);
	}

	throw `unsupported resource url: ${url}`;
}

function get_resource_title(url) {

	let url_path = make_canonical_list_url(url).pathname;

	if(url_path.startsWith("/view/")) {
		let res_path = url_path.replace(/^\/view/, "");
		let res_orig = res_path.split("/").map((c) => decodeURIComponent(c)).join("/");
		return res_orig;
	}

	throw `unsupported resource url: ${url}`;
}

export { fetch_resources, get_resource_title }
