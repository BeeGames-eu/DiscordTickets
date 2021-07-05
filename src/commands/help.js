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

module.exports = {
	name: 'help',
	description: 'Zobrazí menu nápovědy',
	usage: '[command]',
	aliases: ['command', 'commands'],
	example: 'help new',
	args: false,
	execute(client, message, args, {config}) {
		const guild = client.guilds.cache.get(config.guild);

		// TODO(TTtie): tohle je na picu, prepsat...
		const commands = Array.from(client.commands.values());

		if (!args.length) {
			let cmds = [];

			for (let command of commands) {
				if (command.hide) continue;
				if (command.permission && !message.member.hasPermission(command.permission)) continue;

				let desc = command.description;

				if (desc.length > 50) desc = desc.substring(0, 50) + '...';
				cmds.push(`**${config.prefix}${command.name}** **·** ${desc}`);
			}

			message.channel.send(
				new MessageEmbed()
					.setTitle('Příkazy')
					.setColor(config.colour)
					.setDescription(
						`\nPříkazy, ke kterým máš přístup, jsou vypsány níže. Napiš \`${config.prefix}help [příkaz]\` pro více informací o určitém příkazu.
						\n${cmds.join('\n')}
						\nProsím, kontaktuj člena týmu, pokud chceš s něčím pomoci.`
					)
					.setFooter(guild.name, guild.iconURL())
			).catch((error) => {
				log.warn('Could not send help menu');
				log.error(error);
			});

		} else {
			const name = args[0].toLowerCase();
			const command = client.commands.get(name) || client.commands.find(c => c.aliases && c.aliases.includes(name));

			if (!command)
				return message.channel.send(
					new MessageEmbed()
						.setColor(config.err_colour)
						.setDescription(`❌ **Neplatný příkaz** (napiš \`${config.prefix}help\` pro jejich seznam)`)
				);


			const cmd = new MessageEmbed()
				.setColor(config.colour)
				.setTitle(command.name);


			if (command.long) cmd.setDescription(command.long);
			else cmd.setDescription(command.description);

			if (command.aliases) cmd.addField('Aliasy', `\`${command.aliases.join(', ')}\``, true);

			if (command.usage) cmd.addField('Použití', `\`${config.prefix}${command.name} ${command.usage}\``, false);

			if (command.usage) cmd.addField('Příklad', `\`${config.prefix}${command.example}\``, false);


			if (command.permission && !message.member.hasPermission(command.permission)) {
				cmd.addField('Vyžadované oprávnění', `\`${command.permission}\` :exclamation: Nemáš právo používat tento příkaz`, true);
			} else cmd.addField('Vyžadované oprávnění', `\`${command.permission || 'none'}\``, true);

			message.channel.send(cmd);
		}

		// command ends here
	},
};
