/**
 *
 *  @name DiscordTickets
 *  @author eartharoid <contact@eartharoid.me>
 *  @license GNU-GPLv3
 *
 */

const Logger = require('leekslazylogger');
const log = new Logger();
const { MessageEmbed } = require('discord.js');
const { promises: { access } } = require("fs");
const { join } = require('path');
const archive = require('../modules/archive');

const exists = path => access(path).then(() => true, () => false);

module.exports = {
	name: 'close',
	description: 'Zavře ticket; buď zmíněný kanál, nebo kanál, ve kterém je příkaz použit.',
	usage: '[ticket]',
	aliases: ['none'],
	example: 'close #ticket-17',
	args: false,
	async execute(client, message, args, { config, Ticket }) {
		const guild = client.guilds.cache.get(config.guild);

		const notTicket = new MessageEmbed()
			.setColor(config.err_colour)
			.setAuthor(message.author.username, message.author.displayAvatarURL())
			.setTitle('❌ **Nejsi v kanálu s ticketem**')
			.setDescription('Použij tento příkaz v kanálu ticketu, který chceš uzavřít, nebo jej zmiň.')
			.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
			.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
			.setFooter(guild.name, guild.iconURL());

		let ticket;
		let channel = message.mentions.channels.first();
		// || client.channels.resolve(await Ticket.findOne({ where: { id: args[0] } }).channel) // channels.fetch()

		if (!channel) {
			channel = message.channel;

			ticket = await Ticket.findOne({
				where: {
					channel: channel.id
				}
			});
			if (!ticket) return message.channel.send(notTicket);
		} else {
			ticket = await Ticket.findOne({
				where: {
					channel: channel.id
				}
			});
			if (!ticket) {
				notTicket
					.setTitle('❌ **Vybraný kanál není ticket**')
					.setDescription(`${channel} není kanál s ticketem.`);
				return message.channel.send(notTicket);
			}

		}

		if (message.author.id !== ticket.creator && !message.member.roles.cache.has(config.staff_role))
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Chybějící oprávnění**')
					.setDescription(`Nemáš právo zavřít ${channel}, protože není tvůj a nejsi členem týmu.`)
					.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
					.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
					.setFooter(guild.name, guild.iconURL())
			);

		let success;
		let pre = (await exists(join(__dirname, `../../user/transcripts/text/${channel.id}.txt`)) ||
				await exists(join(__dirname, `../../user/transcripts/raw/${channel.id}.log`))) ?
			`Budeš moci se později podívat na archiv pomocí \`${config.prefix}transcript ${ticket.id}\`` :
			'';

		let confirm = await message.channel.send(
			new MessageEmbed()
				.setColor(config.colour)
				.setAuthor(message.author.username, message.author.displayAvatarURL())
				.setTitle('❔ Opravdu chceš ticket zavřít?')
				.setDescription(`${pre}\n**Zareaguj pomocí ✅ pro potvrzení.**`)
				.setFooter(guild.name + ' | Vyprší za 15 sekund', guild.iconURL())
		);

		await confirm.react('✅');

		const collector = confirm.createReactionCollector(
			(r, u) => r.emoji.name === '✅' && u.id === message.author.id, {
				time: 15000
			});

		collector.on('collect', async () => {
			if (channel.id !== message.channel.id) {
				channel.send(
					new MessageEmbed()
						.setColor(config.colour)
						.setAuthor(message.author.username, message.author.displayAvatarURL())
						.setTitle('✅ **Ticket uzavřen**')
						.setDescription(`Ticket uzavřen uživatelem ${message.author}`)
						.setFooter(guild.name, guild.iconURL())
				);
			}

			confirm.reactions.removeAll();
			confirm.edit(
				new MessageEmbed()
					.setColor(config.colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle(`✅ **Ticket ${ticket.id} byl uzavřen**`)
					.setDescription('Tento kanál bude za chvíli automaticky smazán, až se zarchivuje jeho obsah.')
					.setFooter(guild.name, guild.iconURL())
			);

			if (config.transcripts.text.enabled || config.transcripts.web.enabled) {
				let u = await client.users.fetch(ticket.creator);

				if (u) {
					let dm;
					try {
						dm = u.dmChannel || await u.createDM();
					} catch (e) {
						log.warn(`Could not create DM channel with ${u.tag}`);
					}


					let res = {};
					const embed = new MessageEmbed()
						.setColor(config.colour)
						.setAuthor(message.author.username, message.author.displayAvatarURL())
						.setTitle(`Ticket ${ticket.id}`)
						.setFooter(guild.name, guild.iconURL());

					if (await exists(join(__dirname, `../../user/transcripts/text/${ticket.get('channel')}.txt`))) {
						embed.addField('Textový přepis', 'Viz příloha');
						res.files = [{
							attachment: join(__dirname, `../../user/transcripts/text/${ticket.get('channel')}.txt`),
							name: `ticket-${ticket.id}-${ticket.get('channel')}.txt`
						}];
					}

					if (await exists(join(__dirname, `../../user/transcripts/raw/${ticket.get('channel')}.log`)) &&
						await exists(join(__dirname, `../../user/transcripts/raw/entities/${ticket.get('channel')}.json`))) {
						embed.addField('Webový archiv', await archive.export(Ticket, channel));
					}

					if (embed.fields.length < 1) {
						embed.setDescription(`Textový přepis ani archivní data pro ticket ${ticket.id} neexistují`);
					}

					res.embed = embed;


					try {
						await Promise.all([
							dm.send(res).catch(() => void 0), // ignore failure as it doesn't matter
							client.channels.cache.get(config.transcripts.channel)?.send(res) ?? Promise.resolve()
						]);
					} catch (e) {
						message.channel.send('❌ Nelze odeslat přepis');
					}
				}
			}

			// update database
			success = true;
			ticket.update({
				open: false
			}, {
				where: {
					channel: channel.id
				}
			});

			// delete messages and channel
			setTimeout(() => {
				channel.delete();
				if (channel.id !== message.channel.id)
					message.delete()
						.then(() => confirm.delete());
			}, 5000);

			log.info(`${message.author.tag} closed a ticket (#ticket-${ticket.id})`);

			if (config.logs.discord.enabled) {
				client.channels.cache.get(config.logs.discord.channel).send(
					new MessageEmbed()
						.setColor(config.colour)
						.setAuthor(message.author.username, message.author.displayAvatarURL())
						.setTitle('Ticket uzavřen')
						.addField('Autor', `<@${ticket.creator}>`, true)
						.addField('Uzavřen uživatelem', message.author, true)
						.addField("ID ticketu", ticket.id, true)
						.setFooter(guild.name, guild.iconURL())
						.setTimestamp()
				);
			}
		});


		collector.on('end', () => {
			if (!success) {
				confirm.reactions.removeAll();
				confirm.edit(
					new MessageEmbed()
						.setColor(config.err_colour)
						.setAuthor(message.author.username, message.author.displayAvatarURL())
						.setTitle('❌ **Čas vypršel**')
						.setDescription('Trvalo ti moc dlouho zareagovat; operace byla zrušena.')
						.setFooter(guild.name, guild.iconURL()));

				message.delete({
					timeout: 10000
				})
					.then(() => confirm.delete());
			}
		});

	}
};