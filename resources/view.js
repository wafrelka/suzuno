import { List } from "./list.js";
import { Navi } from "./navi.js";
import { get_directory_url } from "./url.js";
import { fetch_json } from "./util.js";

function fetch_resources(url) {

	let url_path = new URL(url).pathname;

	if(url_path.startsWith("/view/")) {
		let res_path = url_path.replace(/^\/view/, "");
		return fetch_json(`/meta/directory${res_path}`);
	}

	throw `unsupported resource url: ${url}`;
}

function add_link(base_url, resource) {
	if(resource.type == "directory") {
		return {
			link: get_directory_url(base_url, resource.name),
			...resource
		};
	} else {
		return resource;
	}
}

document.addEventListener("DOMContentLoaded", () => {

	let list_elem = document.getElementById("list");
	let list = new List(list_elem);

	let header_elem = document.getElementById("header");
	let menu_elem = document.getElementById("menu");
	let navi = new Navi(header_elem, menu_elem);

	fetch_resources(document.location).then((resp) => {
		let resources = resp.resources.map((r) => add_link(document.location, r));
		list.update(resources);
		navi.update_title("", resp.path, "");
	}).catch((err) => {
		list.set_error_message(`failed to load: ${err}`);
	});

	list.on_file_selected = (url) => {
		console.log(`selected: file ${url}`);
	};
	list.on_directory_selected = (url) => {
		console.log(`selected: dir ${url}`);
	};
});
