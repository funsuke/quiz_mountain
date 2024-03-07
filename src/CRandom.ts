/**
 * ランダムクラス
 */
export class Random {
	/**
	 * 乱数生成器
	 */
	private rnd: g.RandomGenerator;

	/**
	 * 乱数クラス生成
	 * @param rnd 乱数生成器(通常はg.game.randomなど)
	 */
	constructor(rnd: g.RandomGenerator) {
		this.rnd = rnd;
	}

	/**
	 * 乱数値(0<=rnd<1.0)を出力
	 * @returns {number} 小数値
	 */
	public get(): number {
		return this.rnd.generate();
	}

	/**
	 * 整数の乱数値を出力
	 * @param {number} start 開始値
	 * @param {number} stop 閾値(含まない)
	 * @param {number} step 増減値
	 * @returns {number} 整数値
	 */
	public randRange(start: number = 0, stop: number = 2, step: number = 1): number {
		return Math.floor(start + (stop - start) * this.rnd.generate() * step);
	}
	public _randRange(rnd: g.RandomGenerator, start: number = 0, stop: number = 2, step: number = 1): number {
		return Math.floor(start + (stop - start) * rnd.generate() * step);
	}

	/**
	 * ０から指定した数までのランダムな組合せの配列を返す(nCr)
	 * @param {number} length 全体の数
	 * @param {number} pick 選ぶ数
	 * @returns {number[]} 組合せの配列
	 */
	public getRndCombination(length: number, pick: number): number[] {
		const array = [];
		for (let i = 0; i < length; i++) {
			array[i] = i;
		}
		const arrPick = [];
		for (let i = 0; i < pick; i++) {
			let select = this.randRange(0, array.length);
			arrPick[i] = array.splice(select, 1)[0];
		}
		return arrPick;
	}
	public _getRndCombination(rnd: g.RandomGenerator, length: number, pick: number): number[] {
		const array = [];
		for (let i = 0; i < length; i++) {
			array[i] = i;
		}
		const arrPick = [];
		for (let i = 0; i < pick; i++) {
			let select = this._randRange(rnd, 0, array.length);
			arrPick[i] = array.splice(select, 1)[0];
		}
		return arrPick;
	}
}
