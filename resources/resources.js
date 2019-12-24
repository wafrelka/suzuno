
import { fetch_json, fetch_json_by_post, splitN } from "./util.js";
import { make_canonical_list_url, make_directory_url } from "./path.js";

function parse_bookmark_path(path) {

	if(!path.startsWith("/")) {
		throw `broken bookmark path: ${path}`;
	}

	let comps = splitN(path, "/", 4);
	let rel_path = comps[3] || null;

	if(rel_path !== null) {
		rel_path = "/" + rel_path;
	}

	return {
		tag: comps[1] || null,
		num: comps[2] || null,
		path: rel_path,
	};
}

function insert_name_links(base_url, resources) {
	for(let res of resources) {
		if(res.type === "directory") {
			res.link = make_directory_url(base_url, res.name);
		}
	}
	return resources;
}

function insert_num_links(base_url, items, resources) {
	for(let i = 0; i < resources.length; i++) {
		let res = resources[i];
		let tag_item = items[i];
		if(res.type === "directory") {
			res.link = make_directory_url(base_url, tag_item.num);
		}
	}
}

function fetch_resources(url, bookmark_list, controller = undefined) {

	let url_path = make_canonical_list_url(url).pathname;

	if(url_path.startsWith("/view/")) {
		let res_path = url_path.replace(/^\/view/, "");
		return fetch_json(`/meta/directory${res_path}`, controller).then(r => ({
			resources: insert_name_links(url, r.resources),
			...r
		}));
	}

	if(url_path.startsWith("/bookmark/")) {

		let res_path = url_path.replace(/^\/bookmark/, "");
		let info = parse_bookmark_path(res_path);

		if(info.tag === null) {
			return {
				resources: bookmark_list.tags().map(t => ({
					type: "directory",
					name: t.name,
					link: `/bookmark/${encodeURIComponent(t.name)}`,
				})),
			};
		}

		let tag = bookmark_list.find_tag(info.tag);
		let items = bookmark_list.items(tag.id);

		if(info.num === null) {
			let req_body = { targets: items.map(v => v.path) };
			return fetch_json_by_post("/meta/batch", req_body, controller).then(r => ({
				resources: insert_num_links(url, items, r.resources),
				...r
			}));
		}

		let item = items.find(v => v.num === info.num);
		let encoded = item.path.split("/").map(c => encodeURIComponent(c)).join("/");

		return fetch_json(`/meta/directory${encoded}${info.path || ""}`, controller).then(r => ({
			resources: insert_name_links(url, r.resources),
			...r
		}));
	}

	throw `unsupported resource url: ${url}`;
}

function fetch_resource_path(url, bookmark_list) {

	let url_path = make_canonical_list_url(url).pathname;

	if(url_path.startsWith("/view/")) {
		let res_path = url_path.replace(/^\/view/, "");
		let decoded = res_path.split("/").map((c) => decodeURIComponent(c)).join("/");
		return decoded;
	}

	if(url_path.startsWith("/bookmark/")) {

		let res_path = url_path.replace(/^\/bookmark/, "");
		let info = parse_bookmark_path(res_path);

		if(info.tag === null) {
			return null;
		}

		let tag = bookmark_list.find_tag(info.tag);
		let items = bookmark_list.items(tag.id);

		if(info.num === null) {
			return null;
		}

		console.log(items, info);
		let item = items.find(v => v.num === info.num);
		let encoded = item.path.split("/").map(c => encodeURIComponent(c)).join("/");
		return `${encoded}${info.path || ""}`;
	}

	throw `unsupported resource url: ${url}`;
}

export { fetch_resources, fetch_resource_path }

/*
	resources := array({
		type: string ("file" | "directory" | "empty"),
		name: string,
		link: string,
		thumbnail_url: string,
		file_url: string,
		path: string
	})
*/
