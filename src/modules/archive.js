/**
 *
 *  @name DiscordTickets
 *  @author eartharoid <contact@eartharoid.me>
 *  @license GNU-GPLv3
 *
 */


const Logger = require('leekslazylogger');
const log = new Logger();
const { promises: { appendFile, access, writeFile, readFile, unlink }} = require("fs");
const { join } = require('path');
const dtf = require('@eartharoid/dtf');
const config = require('../../user/' + require('../').config);
const fetch = require('node-fetch');

const exists = path => access(path).then(() => true, () => false);

module.exports.add = async (message) => {

	if (message.type !== 'DEFAULT') return;

	if (config.transcripts.text.enabled) { // text transcripts
		let path = `../../user/transcripts/text/${message.channel.id}.txt`,
			time = dtf('HH:mm:ss n_D MMM YY', message.createdAt),
			msg = message.cleanContent;
		message.attachments.each(a => msg += '\n' + a.url);
		let string = `[${time}] [${message.author.tag}] :> ${msg}`;

		await appendFile(join(__dirname, path), string + '\n');
	}

	if (config.transcripts.web.enabled) { // web archives
		let raw = `../../user/transcripts/raw/${message.channel.id}.log`,
			json = `../../user/transcripts/raw/entities/${message.channel.id}.json`;

		// TODO(TTtie): why are embeds copied?
		let embeds = [];
		for (let embed in message.embeds) embeds.push({ ...message.embeds[embed] });

		// message
		await appendFile(join(__dirname, raw), JSON.stringify({
			id: message.id,
			author: message.author.id,
			content: message.content, // do not use cleanContent, we want to include the mentions!
			time: message.createdTimestamp,
			embeds: embeds,
			attachments: [...message.attachments.values()]
		}) + '\n');

		// channel entities
		if (!await exists(join(__dirname, json)))
			await writeFile(join(__dirname, json), JSON.stringify({
				entities: {
					users: {},
					channels: {},
					roles: {}
				}
			})); // create new

		let data = JSON.parse(await readFile(join(__dirname, json)));

		// if (!data.entities.users[message.author.id])
		data.entities.users[message.author.id] = {
			avatar: message.author.displayAvatarURL(),
			username: message.author.username,
			discriminator: message.author.discriminator,
			displayName: message.member.displayName,
			color: message.member.displayColor === 0 ? null : message.member.displayColor,
			badge: message.author.bot ? 'bot' : null
		};

		// mentions.users
		message.mentions.members.each(m => data.entities.users[m.id] = { // for mentions
			avatar: m.user.displayAvatarURL(),
			username: m.user.username,
			discriminator: m.user.discriminator,
			displayName: m.user.displayName || m.user.username,
			color: m.displayColor === 0 ? null : m.displayColor,
			badge: m.user.bot ? 'bot' : null
		});

		message.mentions.channels.each(c => data.entities.channels[c.id] = { // for mentions only
			name: c.name
		});

		message.mentions.roles.each(r => data.entities.roles[r.id] = { // for mentions only
			name: r.name,
			color: r.color === 0 ? 7506394 : r.color
		});

		await writeFile(join(__dirname, json), JSON.stringify(data));

	}
};

module.exports.export = (Ticket, channel) => new Promise(async (resolve, reject) => {	
		let ticket = await Ticket.findOne({
			where: {
				channel: channel.id
			}
		});

		let raw = `../../user/transcripts/raw/${channel.id}.log`,
			json = `../../user/transcripts/raw/entities/${channel.id}.json`;

		if (!config.transcripts.web.enabled || !await exists(join(__dirname, raw)) || !await exists(join(__dirname, json))) return reject(false);

		let data = JSON.parse(await readFile(join(__dirname, json)));

		data.ticket = {
			id: ticket.id,
			name: channel.name,
			creator: ticket.creator,
			channel: channel.id,
			topic: channel.topic
		};

		data.messages = [];

		const logLines = await readFile(join(__dirname, raw), {
			encoding: "utf-8"
		}).then(r => r.split("\n"));

		const messages = new Map();

		for (const line of logLines) {
			const message = JSON.parse(line);
			if (!messages.has(message.id)) {
				const idx = data.messages.push(message) - 1;
				messages.set(message.id, idx);
			} else {
				data.messages[messages.get(message.id)] = message;
			}
		}

		let endpoint = config.transcripts.web.server;

		if (endpoint[endpoint.length - 1] === '/') endpoint = endpoint.slice(0, -1);

		endpoint += `/${data.ticket.creator}/${data.ticket.channel}/?key=${process.env.ARCHIVES_KEY}`;

		fetch(encodeURI(endpoint), {
			method: 'post',
			body: JSON.stringify(data),
			headers: { 'Content-Type': 'application/json' },
		})
			.then(res => res.json())
			.then(async res => {
				if (res.status !== 200) {
					log.warn(res);
					return resolve(new Error(`${res.status} (${res.message})`));
				}

				log.success(`Uploaded ticket #${ticket.id} archive to server`);

				await unlink(join(__dirname, raw));
				await unlink(join(__dirname, json));

				resolve(res.url);
			}).catch(e => {
				log.warn(e);
				return resolve(e);
			});
});
