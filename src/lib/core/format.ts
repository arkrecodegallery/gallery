import type { Entry } from "./types";

const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function prettyBirthday(entry: Entry) {
	if (!entry.details.birthday) return "";

	try {
		const split = entry.details.birthday.split(" / ");
		if (split.length != 2) throw "";

		const monthIndex = Number(split[0]) - 1;
		if (Number.isNaN(monthIndex) || monthIndex >= months.length) throw "";

		const day = Number(split[1]);
		if (Number.isNaN(day) || day > 31) throw "";

		return `${months[monthIndex]} ${day}`;
	} catch {
		return entry.details.birthday;
	}
}

export function imperialHeight(entry: Entry) {
	if (!entry.details.height) return "";

	try {
		let height = entry.details.height;
		if (!height.endsWith(" cm")) throw "";
		height = height.substring(0, height.length - 3);

		const cm = Number(height);
		if (Number.isNaN(cm)) throw "";

		const total = Math.round(cm / 2.54);
		const feet = Math.floor(total / 12);
		const inch = Math.floor(total % 12);
		return `${feet.toFixed(0)}' ${inch.toFixed(0)}\"`;
	} catch {
		return entry.details.height;
	}
}

export function imperialWeight(entry: Entry) {
	if (!entry.details.weight) return "";

	try {
		let weight = entry.details.weight;
		if (!weight.endsWith(" kg")) throw "";
		weight = weight.substring(0, weight.length - 3);

		const kg = Number(weight);
		if (Number.isNaN(kg)) throw "";

		const total = Math.round(kg * 2.205);
		return `${total.toFixed(0)} lb`;
	} catch {
		return entry.details.weight;
	}
}
