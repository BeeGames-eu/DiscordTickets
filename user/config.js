/**
 * ###############################################################################################
 *  ____                                        _     _____              _             _
 * |  _ \  (_)  ___    ___    ___    _ __    __| |   |_   _| (_)   ___  | | __   ___  | |_   ___
 * | | | | | | / __|  / __|  / _ \  | '__|  / _` |     | |   | |  / __| | |/ /  / _ \ | __| / __|
 * | |_| | | | \__ \ | (__  | (_) | | |    | (_| |     | |   | | | (__  |   <  |  __/ | |_  \__ \
 * |____/  |_| |___/  \___|  \___/  |_|     \__,_|     |_|   |_|  \___| |_|\_\  \___|  \__| |___/
 *
 * ---------------------
 *      Quick Start
 * ---------------------
 *
 * 	> For detailed instructions, visit the GitHub repository and read the documentation:
 * 	https://github.com/eartharoid/DiscordTickets/wiki
 *
 * 	> IMPORTANT: Also edit the TOKEN in 'user/.env'
 *
 * ---------------------
 *       Support
 * ---------------------
 *
 * 	> Information: https://github.com/eartharoid/DiscordTickets/#readme
 * 	> Discord Support Server: https://go.eartharoid.me/discord
 * 	> Wiki: https://github.com/eartharoid/DiscordTickets/wiki
 *
 * ###############################################################################################
 */

module.exports = {
	prefix: '-',
	name: 'BeeGames - Support',
	presences: [
		{
			activity: 'info@beegames.eu',
			type: 'PLAYING'
		}
	],
	append_presence: ' | %shelp',
	colour: '#009999',
	err_colour: 'RED',
	cooldown: 3,

	guild: '824022859126931496', // ID of your guild
	staff_role: '827089636462952469', // ID of your Support Team role

	tickets: {
		category: '827089638781878272', // ID of your tickets category
		send_img: false,
		ping: false,
		text: `Zdravím, {{ tag }}!
		Člen týmu se ti bude brzy věnovat.
		Mezitím se pokus co nejlépe popsat tvůj problém :)`,
		pin: false,
		max: 3
	},

	transcripts: {
		text: {
			enabled: true,
			keep_for: 90,
		},
		web: {
			enabled: false,
			server: 'https://tickets.example.com',
		},
		channel: "848989224262697000" // ID of the ticket dump channel
	},

	panel: {
		title: '📝 Podpora',
		description: 'Potřebuješ pomoci, nebo se chceš na něco zeptat? Zareaguj na tuto zprávu pro vytvoření nového ticketu.',
		reaction: '📝'
	},

	storage: {
		type: 'sqlite'
	},

	logs: {
		files: {
			enabled: true,
			keep_for: 7
		},
		discord: {
			enabled: false,
			channel: '' // ID of your log channel
		}
	},

	debug: false,
	updater: true
};
