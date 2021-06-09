/**
 *
 *  @name DiscordTickets
 *  @author eartharoid <contact@eartharoid.me>
 *  @license GNU-GPLv3
 *
 */

const { MessageEmbed } = require('discord.js');
const { promises: { access }} = require("fs");
const { join } = require('path');

const exists = path => access(path).then(() => true, () => false);

module.exports = {
	name: 'tickets',
	description: 'Zobrazí vaše předchozí tickety, abyste mohli zobrazit jejich přepis/archiv.',
	usage: '[@člen]',
	aliases: ['list'],
	args: false,
	async execute(client, message, args, {config, Ticket}) {
		const guild = client.guilds.cache.get(config.guild);

		const supportRole = guild.roles.cache.get(config.staff_role);
		if (!supportRole) {
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setTitle('❌ **Chyba**')
					.setDescription(`${config.name} nebyl nastaven správně. Nemohla být nalezena role týmu s ID \`${config.staff_role}\``)
					.setFooter(guild.name, guild.iconURL())
			);
		}

		let context = 'self';
		let user = message.mentions.users.first() || guild.members.cache.get(args[0]);

		if (user) {
			if (!message.member.roles.cache.has(config.staff_role)) {
				return message.channel.send(
					new MessageEmbed()
						.setColor(config.err_colour)
						.setAuthor(message.author.username, message.author.displayAvatarURL())
						.setTitle('❌ **Chybějící oprávnění**')
						.setDescription(`Nemáš právo zobrazovat tickety ostatních, protože nejsi členem týmu.`)
						.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
						.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
						.setFooter(guild.name, guild.iconURL())
				);
			}

			context = 'staff';
		} else user = message.author;

		let openTickets = await Ticket.findAndCountAll({
			where: {
				creator: user.id,
				open: true
			}
		});

		let closedTickets = await Ticket.findAndCountAll({
			where: {
				creator: user.id,
				open: false
			}
		});

		closedTickets.rows = closedTickets.rows.slice(-10); // get most recent 10

		let embed = new MessageEmbed()
			.setColor(config.colour)
			.setAuthor(user.username, user.displayAvatarURL())
			.setTitle(context === "self" ? "Tvoje tickety" : `Tickety uživatele ${user.username}`)
			.setFooter(guild.name + ' | Tato zpráva bude smazána za 60 sekund', guild.iconURL()); //This message will be deleted in 60 seconds

		/* if (config.transcripts.web.enabled) {
			embed.setDescription(`You can access all of your ticket archives on the [web portal](${config.transcripts.web.server}/${user.id}).`);
		} */

		let open = [],
			closed = [];

		for (let t in openTickets.rows)  {
			let desc = openTickets.rows[t].topic.substring(0, 30);
			open.push(`> <#${openTickets.rows[t].channel}>: \`${desc}${desc.length > 20 ? '...' : ''}\``);
		}

		for (let t in closedTickets.rows)  {
			let desc = closedTickets.rows[t].topic.substring(0, 30);
			let transcript = '';
			let c = closedTickets.rows[t].channel;
			if (config.transcripts.web.enabled || await exists(join(__dirname, `../../user/transcripts/text/${c}.txt`))) {
				transcript = `\n> Napiš \`${config.prefix}transcript ${closedTickets.rows[t].id}\` pro zobrazení.`;
			}

			closed.push(`> **#${closedTickets.rows[t].id}**: \`${desc}${desc.length > 20 ? '...' : ''}\`${transcript}`);

		}

		let pre = context === 'self' ? 'Nemáš' : `Uživatel ${user.username} nemá`;
		embed.addField('Otevřené tickety', openTickets.count === 0 ? `${pre} žádné otevřené tickety.` : open.join('\n\n'), false); // Open tickets // no open tickets
		embed.addField('Zavřené tickety', closedTickets.count === 0 ? `${pre} žádné uzavřené tickety` : closed.join('\n\n'), false); //Closed tickets // no old tickets

		message.delete({timeout: 15000});

		let channel;
		try {
			channel = message.author.dmChannel || await message.author.createDM();
			message.channel.send('Posláno do soukromé zprávy.').then(msg => msg.delete({timeout: 15000}));
		} catch (e) {
			channel = message.channel;
		}

		let m = await channel.send(embed);
		m.delete({timeout: 60000});
	},
};