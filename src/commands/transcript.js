/**
 *
 *  @name DiscordTickets
 *  @author eartharoid <contact@eartharoid.me>
 *  @license GNU-GPLv3
 *
 */

const { promises: { access }} = require("fs");
const { join } = require('path');

const exists = path => access(path).then(() => true, () => false);

const {
	MessageEmbed
} = require('discord.js');

module.exports = {
	name: 'transcript',
	description: 'Stáhne přepis ticketu',
	usage: '<ticket-id>',
	aliases: ['archive', 'download'],
	example: 'transcript 57',
	args: true,
	async execute(client, message, args, {config, Ticket}) {
		const guild = client.guilds.cache.get(config.guild);
		const id = args[0];

		let ticket = await Ticket.findOne({
			where: {
				id: id,
				open: false
			}
		});


		if (!ticket) {
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Neznámý ticket**')
					.setDescription('Nebyl nalezen uzavřený ticket s tímto ID') //Couldn\'t find a closed ticket with that ID
					.setFooter(guild.name, guild.iconURL())
			);
		}

		if (message.author.id !== ticket.creator && !message.member.roles.cache.has(config.staff_role)) {
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Chybějící oprávnění**')
					.setDescription(`Nemáš právo si stáhnout přepis ticketu ${id}, protože není tvůj a nejsi členem týmu.`)
					.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
					.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
					.setFooter(guild.name, guild.iconURL())
			);
		}

		let res = {};
		const embed = new MessageEmbed()
			.setColor(config.colour)
			.setAuthor(message.author.username, message.author.displayAvatarURL())
			.setTitle(`Ticket ${id}`)
			.setFooter(guild.name, guild.iconURL());

		let file = `../../user/transcripts/text/${ticket.channel}.txt`;
		if (await exists(join(__dirname, file))) {
			embed.addField('Textový přepis', 'Viz příloha');
			res.files = [
				{
					attachment: join(__dirname, file),
					name: `ticket-${id}-${ticket.channel}.txt`
				}
			];
		}


		const BASE_URL = config.transcripts.web.server;
		if (config.transcripts.web.enabled) embed.addField('Webový přepis', `${BASE_URL}/${ticket.creator}/${ticket.channel}`);

		if (embed.fields.length < 1) embed.setDescription(`Textový přepis ani archivní data pro ticket ${ticket.id} neexistují`); //No text transcripts or archive data exists for ticket

		res.embed = embed;

		let channel;
		try {
			channel = message.author.dmChannel || await message.author.createDM();
		} catch (e) {
			channel = message.channel;
		}

		channel.send(res).then(m => {
			if (channel.id === message.channel.id) m.delete({timeout: 15000});
		});
		message.delete({timeout: 1500});
	}
};