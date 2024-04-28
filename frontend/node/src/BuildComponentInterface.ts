export default interface BuildComponent {
	/**
	 * Execute the process
	 *
	 * @param {string[]} args - Arguments passed to the script
	 */
	execute(args: string[]): Promise<void>;
}
