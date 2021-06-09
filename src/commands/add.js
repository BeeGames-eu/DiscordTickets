/**
 *
 *  @name DiscordTickets
 *  @author eartharoid <contact@eartharoid.me>
 *  @license GNU-GPLv3
 *
 */

const { MessageEmbed } = require('discord.js');
const Logger = require('leekslazylogger');
const log = new Logger();

module.exports = {
	name: 'add',
	description: 'Přidá člena do ticketu', // Add a member to a ticket channel
	usage: '<@člen> [... #kanál]',
	aliases: ['none'],
	example: 'add @Člen #ticket-23',
	args: true,
	async execute(client, message, args, {config, Ticket}) {
		const guild = client.guilds.cache.get(config.guild);

		const notTicket = new MessageEmbed()
			.setColor(config.err_colour)
			.setAuthor(message.author.username, message.author.displayAvatarURL())
			.setTitle('❌ **Nejsi v kanálu s ticketem**')
			.setDescription('Použij tento příkaz v kanálu ticketu, kam chceš uživatele přidat, nebo jej zmiň.')
			.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
			.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
			.setFooter(guild.name, guild.iconURL());

		let ticket;

		let channel = message.mentions.channels.first();

		if (!channel) {
			channel = message.channel;
			ticket = await Ticket.findOne({ where: { channel: message.channel.id } });
			if (!ticket) return message.channel.send(notTicket);

		} else {
			ticket = await Ticket.findOne({ where: { channel: channel.id } });
			if (!ticket) {
				notTicket
					.setTitle('❌ **Vybraný kanál není ticket**')
					.setDescription(`${channel} není kanál s ticketem.`);
				return message.channel.send(notTicket);
			}
		}

		if (message.author.id !== ticket.creator && !message.member.roles.cache.has(config.staff_role)) {
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Chybějící oprávnění**')
					.setDescription(`Nemáš právo upravovat ${channel}, protože není tvůj a nejsi členem týmu.`)
					.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
					.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
					.setFooter(guild.name, guild.iconURL())
			);
		}

		let member = guild.member(message.mentions.users.first() || guild.members.cache.get(args[0]));

		if (!member) {
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Neznámý uživatel**')
					.setDescription('Prosím, zmiň správného uživatele.')
					.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
					.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
					.setFooter(guild.name, guild.iconURL())
			);
		}

		try {
			channel.updateOverwrite(member.user, {
				VIEW_CHANNEL: true,
				SEND_MESSAGES: true,
				ATTACH_FILES: true,
				READ_MESSAGE_HISTORY: true
			});

			if (channel.id !== message.channel.id) {
				channel.send(
					new MessageEmbed()
						.setColor(config.colour)
						.setAuthor(member.user.username, member.user.displayAvatarURL())
						.setTitle('✅ **Uživatel přidán**')
						.setDescription(`Uživatel ${member} byl přidán uživatelem ${message.author}`)
						.setFooter(guild.name, guild.iconURL())
				);
			}

			message.channel.send(
				new MessageEmbed()
					.setColor(config.colour)
					.setAuthor(member.user.username, member.user.displayAvatarURL())
					.setTitle('✅ **Uživatel přidán**')
					.setDescription(`Uživatel ${member} byl přidán do <#${ticket.channel}>`)
					.setFooter(guild.name, guild.iconURL())
			);

			log.info(`${message.author.tag} added a user to a ticket (#${message.channel.id})`);
		} catch (error) {
			log.error(error);
		}
		// command ends here
	},
};
