/*
akashic init -t typescript
npm run build
akashic-sandbox
akashic scan asset
bmpfont-generator --chars '0123456789' --height 48 --fill #000000 --stroke #ffffff rounded-x-mplus-1c-black.ttf bitmap.png --margin 8
ffmpeg -ss 0.0 -to 1.5 -i se.mp3 -af volume=-5dB se.ogg
ffmpeg -i input1.mp3 -i input2.mp3 -filter_complex "concat=n=2:v=0:a=1" output.mp3
akashic export zip --output game.zip --nicolive -f
*/

// 謝辞やライセンス表示用のGUI
import aimgui = require("@akashic-extension/aimgui");
// 共通乱数クラス
import { Random } from "./CRandom";
import { GameMainParameterObject } from "./parameterObject";

interface QuizObject {
	top: string;				// TOPに表示する絵
	center: string;			// CENTERに表示する質問文
	correct: string;			// 正答
	wrong: string[];		// 誤答(４択だから３つ以上)
}

// デバッグ時などに変更してください
let isSound: boolean = true;		// 効果音を鳴らすフラグ
let isMusic: boolean = true;		// 音楽を鳴らすフラグ
let countDown: number = 4.5;		// カウントダウンを開始する秒数

// グローバルにする必要があった変数
let orderIdx: number = 0;

// *************************************************************
// メイン関数
// *************************************************************
export function main(param: GameMainParameterObject): void {
	// ＵＩイメージアセットＩＤ
	const assetsUI: string[] = [
		"tutorial", "clock", "finish", "credit",
		"buttonMusic", "buttonSound",
		"panelTop", "panelCenter", "panelLarge", "panelSmall", "batumaru",
	];
	// 音関連アセットＩＤ
	const assetsAudio: string[] = [
		"nc178020",
		"se_start",
		"se_seikai",
		"se_hazure",
		"se_finish",
	];
	// テキストアセットＩＤ
	const assetsText: string[] = [
		"license", "quiz",
	];
	// 写真素材
	const assetsPhoto: string[] = [];
	for (let i = 0; i < 100; i++) {
		assetsPhoto.push(("00" + (i + 1)).slice(-3));
	}
	// シーンの設定
	const scene = new g.Scene({
		game: g.game,
		assetIds: [...assetsUI, ...assetsAudio, ...assetsText, ...assetsPhoto],
	});
	// ゲームスコアの設定
	g.game.vars.gameState = { score: 0 };
	// クイズの仕様などの設定
	const TIME_LIMIT: number = 90;				// 制限時間(秒)
	let timeRemaining: number = TIME_LIMIT;			// 経過時間(秒)
	let isStart: boolean = false;			// ゲーム開始フラグ
	let isFinish: boolean = false;		// ゲーム終了フラグ
	let isCheckAns: boolean = true;		// 不正解時に答え合わせをするか
	// let startFrame = 0;
	// フォントの生成
	const font = new g.DynamicFont({
		game: g.game,
		fontFamily: "sans-serif",
		// "sans-serif": サンセリフ体・ゴシック体のフォント。
		// "serif": セリフ体・明朝体のフォント。
		// "monospace": 等幅フォント。
		fontWeight: "bold", // "normal"　または　"bold"
		size: 96,
		fontColor: "black",
		strokeWidth: 8,
		strokeColor: "white",
	});
	// GUIで利用するフォント
	const fontGUI = new g.DynamicFont({
		game: g.game,
		fontFamily: "serif",
		size: 20,
		fontColor: "white",
	});

	// =============================================================
	// シーン読込時処理
	// =============================================================
	scene.onLoad.add(() => {
		// 乱数の設定
		const rand = new Random(param.random);

		// レイヤーの生成
		const layerBack = new g.E({
			scene: scene,
			parent: scene
		});
		const layerUI = new g.E({
			scene: scene,
			parent: scene
		});
		const layerButton = new g.E({
			scene: scene,
			parent: scene
		});

		// -------------------------------------------------------------
		// aimgui
		// -------------------------------------------------------------
		// GUIのテキストボックスに設定するテキスト
		const license = scene.asset.getTextById("license").data;
		// GUI表示エンティティ
		const guiE = new aimgui.GuiE({
			scene: scene,
			width: g.game.width,
			height: g.game.height,
			font: fontGUI,
			hidden: true,
		});
		// GUIの配置・応答の実装
		guiE.run = (gui: aimgui.Gui) => {
			gui.window("著作権等の表示").position(290, 10).size(700, 700).resizable(false).show((gui: aimgui.Gui) => {
				gui.textBox("text box", 667, license);
			});
		};
		scene.append(guiE);

		// ＢＧＭとスタート音
		if (isMusic) scene.asset.getAudioById("nc178020").play().changeVolume(0.5);
		scene.setTimeout(function () {
			if (isSound) scene.asset.getAudioById("se_start").play().changeVolume(0.7);
		}, (countDown > 1 ? countDown - 1 : 1) * 1000);

		// カウントダウンラベル
		const lblCount = new g.Label({
			scene: scene,
			text: "",
			parent: layerUI,
			font: font,
			fontSize: 64,
			x: g.game.width * 0.9,
			y: g.game.height * 0.15,
			anchorX: 0.5,
			anchorY: 0.5
		});
		const strCount: string[] = ["", "Go!", "1", "2", "3"];
		lblCount.onUpdate.add(() => {
			if (countDown > -1 && countDown <= 4) {
				lblCount.text = strCount[Math.ceil(countDown)];
				lblCount.invalidate();
			}
		});
		// チュートリアル
		const tutorial = new g.Sprite({
			scene: scene,
			src: scene.asset.getImageById("tutorial"),
			parent: layerButton,
			// 1280x720 = 画面サイズ = 画像サイズ なら問題なし
			// x: g.game.width / 2,
			// y: g.game.height / 2,
			// anchorX: 0.5,
			// anchorY: 0.5,
		});

		// -------------------------------------------------------------
		// メイン描画
		// -------------------------------------------------------------
		// 背景
		new g.FilledRect({
			scene: scene,
			cssColor: "white",
			parent: layerBack,
			width: g.game.width,
			height: g.game.height,
			opacity: 0.3,
			touchable: false,
		});
		// let background = new g.Sprite({ // 画像の背景
		// 	scene: scene, src: scene.assets["background"], parent: layerBack,
		// 	width: g.game.width, height: g.game.height,
		// 	opacity: 0.4, touchable: false,
		// });

		// -------------------------------------------------------------
		// 出題内容
		// -------------------------------------------------------------
		let panelLargeScale = 1;	// 上部出題欄panelTopと 大型回答欄panelLarge
		let panelSmallScale = 1;	// 中央出題欄panelCenterと 小型回答欄panelSmall
		// クイズの読み込み
		const quizJSON = scene.asset.getJSONContentById("quiz");
		const quiz: QuizObject[] = [];
		for (let i = 0; i < Object.keys(quizJSON).length; i++) {
			const key: string = ("00" + (i + 1)).slice(-3);
			const obj: QuizObject = {
				top: key,
				center: quizJSON[key].center,
				correct: quizJSON[key].correct,
				wrong: quizJSON[key].wrong,
			};
			quiz.push(obj);
		};

		// -------------------------------------------------------------
		// 出題順決定
		// -------------------------------------------------------------
		// ４択の設定
		const ans: string[][] = [];
		for (let i = 0; i < quiz.length; i++) {
			ans[i] = [];
			ans[i].push(quiz[i].correct);
			const hazure = rand.getRndCombination(quiz[i].wrong.length, 3);
			ans[i].push(quiz[i].wrong[hazure[0]]);
			ans[i].push(quiz[i].wrong[hazure[1]]);
			ans[i].push(quiz[i].wrong[hazure[2]]);
		}
		// 出題順
		let order: number[] = [];
		order = rand.getRndCombination(quiz.length, quiz.length);

		// -------------------------------------------------------------
		// 出題・回答パネル配置
		// -------------------------------------------------------------
		// 結果画像
		const imgResult = new g.FrameSprite({
			scene: scene,
			src: scene.asset.getImageById("batumaru"),
			parent: layerUI,
			x: 0,
			y: 0,
			width: 200,
			height: 200,
			frames: [1],
			anchorX: 0.5,
			anchorY: 0.5,
			opacity: 0.0,
		});

		// 出題用画面(パネル)の生成
		function makeQuiz(): void {
			// タッチ用レイヤー
			let layerTouch = new g.E({ scene: scene, parent: layerBack });
			// 内部用ランダム(非同配置)
			let pos = rand._getRndCombination(g.game.random, 4, 4);
			makePanel(0.5, 0.24, "panelTop", -1, layerTouch);
			makePanel(0.5, 0.5, "panelCenter", -1, layerTouch);
			for (var i = 0; i < 4; i++) {
				makePanel(0.31 + 0.38 * (i % 2), 0.68 + 0.2 * Math.floor(i / 2), "panelSmall", pos[i], layerTouch);
			}
		}

		// 出題用画面の各パネルの生成
		function makePanel(x: number, y: number, assetId: string, pos: number, layer: g.E): void {
			const frameStart: number = g.game.age;
			const panel = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById(assetId),
				parent: layer,
				x: g.game.width * x,
				y: g.game.height * y,
				anchorX: 0.5,
				anchorY: 0.5,
				touchable: true,
				tag: {
					orderIdx: orderIdx,
					isCorrect: pos === 0,
				},
			});
			if (isCheckAns && pos === 0) {
				imgResult.x = panel.x;
				imgResult.y = panel.y;
				imgResult.modified();
			}
			if (assetId === "panelSmall" || assetId === "panelLarge") {
				panel.onPointDown.add((ev: g.PointDownEvent) => {
					if (isStart && !isFinish) {
						if (panel.tag.orderIdx === orderIdx) {
							let score = 0; // 不正解のときの得点
							if (panel.tag.isCorrect) {
								score = Math.floor(150 - (g.game.age - frameStart) / g.game.fps * 10);
								if (score < 100) score = 100;
								if (isSound) scene.asset.getAudioById("se_seikai").play().changeVolume(0.4);
							} else {
								if (isSound) scene.asset.getAudioById("se_hazure").play().changeVolume(0.6);
							}
							g.game.vars.gameState.score += score;
							if (g.game.vars.gameState.score < 0) g.game.vars.gameState.score = 0;
							// クイズを次へ、万が一クイズを使い切ったらループ
							orderIdx = ++orderIdx % quiz.length;
							// const batumaru = new g.FrameSprite({
							// 	scene: scene,
							// 	src: scene.asset.getImageById("batumaru"),
							// 	parent: layer,
							// 	x: panel.x,
							// 	y: panel.y,
							// 	width: 200,
							// 	height: 200,
							// 	frames: [1 * panel.tag.isCorrect],
							// 	anchorX: 0.5,
							// 	anchorY: 0.5,
							// 	opacity: 0.5,
							// 	touchable: false,
							// });
							if (!panel.tag.isCorrect && isCheckAns) {
								imgResult.opacity = 0.5;
								imgResult.modified();
							}
							// スコア加算用ラベル
							new g.Label({
								scene: scene,
								text: score > 0 ? "+" + score : "" + score,
								parent: layer,
								font: font,
								fontSize: 48,
								x: g.game.width - 16,
								y: lblScore.y + 70,
								anchorX: 1,
								anchorY: 0.5,
							});
							// 次の問題へ移行
							scene.setTimeout(function () {
								if (!isFinish) {
									layer.destroy();
									lblOrder.text = "Q" + (orderIdx + 1);
									lblOrder.invalidate();
									if (isCheckAns) {
										imgResult.opacity = 0;
										imgResult.modified();
									}
									makeQuiz();
								}
							}, 1250);
						}
					}
				});
			}
			// 画像と大きさの設定
			let asset: string = "";
			let scale: number = 0;
			if (assetId === "panelSmall") {
				asset = ans[order[orderIdx]][pos];
				scale = panelSmallScale;
			} else if (assetId === "panelLarge") {
				asset = ans[order[orderIdx]][pos];
				scale = panelLargeScale;
			} else if (assetId === "panelTop") {
				asset = quiz[order[orderIdx]].top;
				scale = panelLargeScale;
			} else if (assetId === "panelCenter") {
				asset = quiz[order[orderIdx]].center;
				scale = panelLargeScale;
			}
			if (asset in scene.assets) {
				new g.Sprite({
					scene: scene,
					parent: layer,
					src: scene.asset.getImageById(asset),
					x: g.game.width * x,
					y: g.game.height * y,
					scaleX: scale,
					scaleY: scale,
					anchorX: 0.5,
					anchorY: 0.5,
				});
			} else {
				new g.Label({
					scene: scene,
					text: asset,
					parent: layer,
					font: font,
					fontSize: 42,
					x: g.game.width * x,
					y: g.game.height * y - 3,
					anchorX: 0.5,
					anchorY: 0.5,
				});
			}
		}

		// -------------------------------------------------------------
		// ＵＩ
		// -------------------------------------------------------------
		// スコアラベル
		const lblScore = new g.Label({
			scene: scene,
			text: "",
			parent: layerUI,
			font: font,
			fontSize: 42,
			x: g.game.width - 16,
			y: 40,
			anchorX: 1.0,
			anchorY: 0.5,
		});
		lblScore.onUpdate.add(() => {
			lblScore.text = "" + g.game.vars.gameState.score;
			lblScore.invalidate();
		});
		// 現在の問題数
		const lblOrder = new g.Label({
			scene: scene,
			text: "Q1",
			parent: layerUI,
			font: font,
			fontSize: 42,
			x: 30,
			y: lblScore.y + 70,
			anchorY: 0.5,
		});
		// 残り時間表示用ラベル
		const imgClock = new g.Sprite({
			scene: scene,
			src: scene.asset.getImageById("clock"),
			parent: layerUI,
			x: g.game.width * 0.05,
			y: 40,
			scaleX: 0.4,
			scaleY: 0.4,
			anchorX: 1,
			anchorY: 0.42,
		});
		const lblTime = new g.Label({
			scene: scene,
			text: "",
			parent: layerUI,
			font: font,
			fontSize: 42,
			x: imgClock.x,
			y: imgClock.y,
			anchorY: 0.5,
		});
		scene.onUpdate.add(function () {
			lblTime.text = "" + Math.ceil(timeRemaining >= 0 ? timeRemaining : 0);
			lblTime.invalidate();
		});
		// 残り時間表示用バー
		let rctTime = new g.FilledRect({
			scene: scene,
			cssColor: "tomato",
			parent: layerUI,
			width: g.game.width - 8,
			height: 8,
			x: 4,
			y: 4,
			anchorX: 0,
			anchorY: 0,
		});
		rctTime.onUpdate.add(function () {
			rctTime.width = (g.game.width - 8) / TIME_LIMIT * (timeRemaining >= 0 ? timeRemaining : 0);
			rctTime.modified();
		});
		// 音量ボタン
		const btnSound = new g.FrameSprite({
			scene: scene,
			src: scene.asset.getImageById("buttonSound"),
			parent: layerButton,
			x: g.game.width * 0.94,
			y: g.game.height - 160,
			scaleX: 0.7,
			scaleY: 0.7,
			width: 160,
			height: 100,
			frames: [0, 1],
			anchorX: 0.5,
			anchorY: 0.5,
			touchable: true,
		});
		btnSound.onPointDown.add((ev: g.PointDownEvent) => {
			if (isSound) {
				isSound = false;
			} else {
				isSound = true;
			}
		});
		const btnMusic = new g.FrameSprite({
			scene: scene,
			src: scene.asset.getImageById("buttonMusic"),
			parent: layerButton,
			x: g.game.width * 0.94,
			y: g.game.height - 60,
			scaleX: 0.7,
			scaleY: 0.7,
			width: 160,
			height: 100,
			frames: [0, 1],
			anchorX: 0.5,
			anchorY: 0.5,
			touchable: true,
		});
		btnMusic.onPointDown.add((ev: g.PointDownEvent) => {
			if (isMusic) {
				isMusic = false;
				scene.asset.getAudioById("nc178020").stop();
			} else {
				isMusic = true;
				scene.asset.getAudioById("nc178020").play().changeVolume(0.5);
			}
		});
		scene.onUpdate.add(() => {
			if (isSound) {
				btnSound.frameNumber = 0;
				btnSound.modified();
			} else {
				btnSound.frameNumber = 1;
				btnSound.modified();
			}
			if (isMusic) {
				btnMusic.frameNumber = 0;
				btnMusic.modified();
			} else {
				btnMusic.frameNumber = 1;
				btnMusic.modified();
			}
		});

		// -------------------------------------------------------------
		// 終了処理
		// -------------------------------------------------------------
		// 終了の文字
		const finish = new g.Sprite({
			scene: scene,
			src: scene.asset.getImageById("finish"),
			parent: layerButton,
			x: g.game.width / 2,
			y: g.game.height / 2,
			anchorX: 0.5,
			anchorY: 0.5,
			hidden: true,
		});
		// 終了したときに1度だけ処理する内容
		scene.onUpdate.add(() => {
			if (!isFinish && timeRemaining < 0) {
				isFinish = true;
				finish.show();
				if (isSound) scene.asset.getAudioById("se_finish").play().changeVolume(0.8);
				// (追加)クレジットボタン
				const credit = new g.Sprite({
					scene: scene,
					src: scene.asset.getImageById("credit"),
					parent: layerButton,
					x: g.game.width * 0.94,
					y: g.game.height * 0.3,
					scaleX: 1.25,
					scaleY: 1.25,
					anchorX: 0.5,
					anchorY: 0.5,
					touchable: true,
				});
				let isCredit = false;
				credit.onPointDown.add((ev: g.PointDownEvent) => {
					isCredit = !isCredit;
					if (isCredit) {
						guiE.show();
					} else {
						guiE.hide();
					}
				});
			}
		});

		// =============================================================
		// シーン更新時処理
		// =============================================================
		scene.onUpdate.add(() => { // 時間経過
			if (countDown >= 0) {
				countDown -= 1 / g.game.fps;
			} else {
				if (!isStart) {
					makeQuiz();
					tutorial.hide();
				}
				isStart = true;
				timeRemaining -= 1 / g.game.fps;
			}
		});
	});
	g.game.pushScene(scene);
}
