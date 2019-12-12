
import { fetch_json } from "./util.js";
import {
	make_canonical_list_url,
	make_directory_url,
	make_page_url,
} from "./path.js";

function append_links(base_url, resources) {

	let formatted = [];
	let file_count = 0;

	for(let res of resources) {

		if(res.type == "directory") {
			formatted.push({
				link: make_directory_url(base_url, res.name),
				...res
			});
		} else if(res.type == "file") {
			formatted.push({
				link: make_page_url(base_url, file_count),
				...res
			});
			file_count += 1;
		} else {
			formatted.push(res);
		}
	}

	return formatted;
}

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

export { append_links, fetch_resources, get_resource_title }
