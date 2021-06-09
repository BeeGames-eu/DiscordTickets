/**
 *
 *  @name DiscordTickets
 *  @author eartharoid <contact@eartharoid.me>
 *  @license GNU-GPLv3
 *
 */

const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'topic',
	description: 'Změní téma ticketu',
	usage: '<téma>',
	aliases: ['edit'],
	example: 'topic nemůžu použít /lobby',
	args: true,
	async execute(client, message, args, {config, Ticket}) {
		const guild = client.guilds.cache.get(config.guild);

		let ticket = await Ticket.findOne({
			where: {
				channel: message.channel.id
			}
		});

		if (!ticket) {
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Nejsi v kanálu s ticketem**')
					.setDescription('Použij tento příkaz v kanálu ticketu, ve kterém chceš změnit téma, nebo jej zmiň.')
					.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
					.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
					.setFooter(guild.name, guild.iconURL())
			);
		}

		let topic = args.join(' ');
		if (topic.length > 256) {
			return message.channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Popis je příliš dlouhý**')
					.setDescription('Prosím, zkrať téma ticketu na méně než 256 znaků. Jednoduchá věta postačí.')
					.setFooter(guild.name, guild.iconURL())
			);
		}

		message.channel.setTopic(`<@${ticket.creator}> | ` + topic);

		Ticket.update({
			topic: topic
		}, {
			where: {
				channel: message.channel.id
			}
		});

		message.channel.send(
			new MessageEmbed()
				.setColor(config.colour)
				.setAuthor(message.author.username, message.author.displayAvatarURL())
				.setTitle('✅ **Ticket aktualizován**')
				.setDescription('Téma bylo změněno.')
				.setFooter(client.user.username, client.user.displayAvatarURL())
		);
	}
};