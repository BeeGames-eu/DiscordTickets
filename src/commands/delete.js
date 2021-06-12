/**
 *
 *  @name DiscordTickets
 *  @author eartharoid <contact@eartharoid.me>
 *  @license GNU-GPLv3
 *
 */

const Logger = require('leekslazylogger');
const log = new Logger();
const {
	MessageEmbed
} = require('discord.js');
const { promises: { access, unlink } } = require("fs");
const { join } = require('path');

const exists = path => access(path).then(() => true, () => false);

module.exports = {
	name: 'delete',
	description: 'Smaže ticket. Funkčně podobné zavření ticketu, ale neukládá přepis ani archivy.',
	usage: '[ticket]',
	aliases: ['del'],
	example: 'delete #ticket-17',
	args: false,
	async execute(client, message, args, {
		config,
		Ticket
	}) {
		const guild = client.guilds.cache.get(config.guild);

		const notTicket = new MessageEmbed()
			.setColor(config.err_colour)
			.setAuthor(message.author.username, message.author.displayAvatarURL())
			.setTitle('❌ **Nejsi v kanálu s ticketem**')
			.setDescription('Použij tento příkaz v kanálu ticketu, který chceš smazat, nebo jej zmiň.')
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
			if (!ticket) return channel.send(notTicket);

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
		if (!message.member.roles.cache.has(config.staff_role)) 
			return channel.send(
				new MessageEmbed()
					.setColor(config.err_colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle('❌ **Chybějící oprávnění**')
					.setDescription(`Nemáš právo smazat ${channel}, protože nejsi členem týmu.`)
					.addField('Použití', `\`${config.prefix}${this.name} ${this.usage}\`\n`)
					.addField('Pomoc', `Napiš \`${config.prefix}help ${this.name}\` pro více informací`)
					.setFooter(guild.name, guild.iconURL())
			);
		
		let success;

		let confirm = await message.channel.send(
			new MessageEmbed()
				.setColor(config.colour)
				.setAuthor(message.author.username, message.author.displayAvatarURL())
				.setTitle('❔ Opravdu chceš ticket smazat?')
				.setDescription(
					`:warning: Tato akce **nelze vrátit** zpět, ticket bude kompletně smazán z databáze.
					**Nebudeš** moci později zhlédnout přepis/archiv kanálu.
					Pokud nechceš toto chování, použij místo tohoto příkazu příkaz \`close\`
					**Zareaguj pomocí ✅ pro potvrzení.**`)
				.setFooter(guild.name + ' | Vyprší za 15 sekund', guild.iconURL())
		);

		await confirm.react('✅');

		const collector = confirm.createReactionCollector(
			(r, u) => r.emoji.name === '✅' && u.id === message.author.id, {
				time: 15000
			});

		collector.on('collect', async () => {
			if (channel.id !== message.channel.id)
				channel.send(
					new MessageEmbed()
						.setColor(config.colour)
						.setAuthor(message.author.username, message.author.displayAvatarURL())
						.setTitle('✅ **Ticket smazán**')
						.setDescription(`Ticket smazán uživatelem ${message.author}`)
						.setFooter(guild.name, guild.iconURL())
				);

			confirm.reactions.removeAll();
			confirm.edit(
				new MessageEmbed()
					.setColor(config.colour)
					.setAuthor(message.author.username, message.author.displayAvatarURL())
					.setTitle(`✅ **Ticket ${ticket.id} smazán**`)
					.setDescription('Tento kanál bude za chvíli automaticky smazán.')
					.setFooter(guild.name, guild.iconURL())
			);

			let txt = join(__dirname, `../../user/transcripts/text/${ticket.get('channel')}.txt`),
				raw = join(__dirname, `../../user/transcripts/raw/${ticket.get('channel')}.log`),
				json = join(__dirname, `../../user/transcripts/raw/entities/${ticket.get('channel')}.json`);

			if (await exists(txt)) await unlink(txt);
			if (await exists(raw)) await unlink(raw);
			if (await exists(json)) await unlink(json);

			// update database
			success = true;
			ticket.destroy(); // remove ticket from database

			// delete messages and channel
			setTimeout(() => {
				channel.delete();
				if (channel.id !== message.channel.id)
					message.delete()
						.then(() => confirm.delete());
			}, 5000);

			log.info(`${message.author.tag} deleted a ticket (#ticket-${ticket.id})`);

			if (config.logs.discord.enabled) {
				client.channels.cache.get(config.logs.discord.channel).send(
					new MessageEmbed()
						.setColor(config.colour)
						.setAuthor(message.author.username, message.author.displayAvatarURL())
						.setTitle('Ticket smazán')
						.addField('Autor', `<@${ticket.creator}>`, true)
						.addField('Smazán uživatelem', message.author, true)
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