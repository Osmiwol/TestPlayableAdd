import Phaser from "phaser";

type Cell = 0 | 1;
type QuestStage = "bag" | "house" | "vilka" | "done";

// ─────────────────────────────────────────────────────────────
//  ПРОМОКОД: состояния раскрытия
//  Начало:        ________
//  После bag:     DRI_____
//  После house:   DRIVEG__


//  После vilka:   DRIVEG05
// ─────────────────────────────────────────────────────────────
const PROMO_STATES: Record<"initial" | "bag" | "house" | "vilka", string> = {
  initial: "________",
  bag:     "DRI_____",
  house:   "DRIVEG__",
  vilka:   "DRIVEG05",
};

export class GameScene extends Phaser.Scene {
  private baseW = 1080;
  private baseH = 1920;

  private scaleRatio = 1;
  
  private tileSize = 0;
  private offsetY = 0;

  private grid: Cell[][] = [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,1],
    [1,1,1,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,0,0,1],
    [1,1,1,1,1,1,1,0,0,1],
    [1,1,1,1,1,1,1,1,1,1],
  ];

  private player!: Phaser.GameObjects.Image;
  private playerPos = { x: 1, y: 1 };
  private direction = { x: 0, y: 0 };

  

  private pellets: Phaser.GameObjects.Image[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  private lives = 3;
  private hearts: Phaser.GameObjects.Text[] = [];

  // === КВЕСТ ===
  private questStage: QuestStage = "bag";
  private questObject: Phaser.GameObjects.Image | null = null;
  private questObjectPos = { x: 0, y: 0 };

  // Два текстовых объекта для области задания
  private questSuccessText!: Phaser.GameObjects.Text;   // «УСПЕХ»
  private questSubtitleText!: Phaser.GameObjects.Text;  // подпись / следующее задание

  // Промокод
  private promoCodeText!: Phaser.GameObjects.Text;

  private sx!: (v: number) => number;
  private sy!: (v: number) => number;

  constructor() {
    super("GameScene");
  }

  init() {
    this.score = 0;
    this.lives = 3;
    this.pellets = [];
    this.hearts = [];
    this.direction = { x: 0, y: 0 };
    this.playerPos = { x: 1, y: 1 };
    this.questStage = "bag";
    this.questObject = null;
    this.questObjectPos = { x: 0, y: 0 };
  }

  preload() {
    this.load.image("player", "/creta.png");
    this.load.image("coin", "/coin.png");
    this.load.image("logo", "/logo.png");
    this.load.image("bag", "/bag.png");
    this.load.image("house", "/happyHouse.png");
    this.load.image("vilka", "/vilka.png");
	this.load.image("automob", "/BackgroundCar.png");
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.scaleRatio = Math.min(width / this.baseW, height / this.baseH);
    this.sx = (v: number) => v * this.scaleRatio;
    this.sy = (v: number) => v * this.scaleRatio;
    const sx = this.sx;
    const sy = this.sy;

    // === ФОН ===
    const g = this.add.graphics();
    g.fillGradientStyle(0x415789, 0x415789, 0x8B9EAA, 0x8B9EAA, 1);
    g.fillRect(0, 0, width, height);

    // === ЛОГО / ВЕРХНИЙ ТЕКСТ ===
    const startX = sx(76);
    const startY = sy(55);
    const fontSize = sx(80);
    const gap = sx(15);
    const logoSize = sx(60);

    const yandexText = this.add.text(startX, startY, "Яндекс", {
      fontFamily: "Yandex Sans Text",
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color: "#E4E5E9"
    }).setOrigin(0, 0);

    const logoX = startX + yandexText.width + gap;
    const logoY = startY + fontSize / 2;

    this.add.image(logoX, logoY, "logo")
      .setOrigin(0, 0.5)
      .setDisplaySize(logoSize, logoSize);

    const driveX = logoX + logoSize + gap;
    this.add.text(driveX, startY, "Драйв", {
      fontFamily: "Yandex Sans Text",
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color: "#E4E5E9"
    }).setOrigin(0, 0);

    // ─────────────────────────────────────────────────────────
    //  ОБЛАСТЬ ЗАДАНИЯ
    //  questSuccessText — «УСПЕХ», скрыт до первого подбора
    //  questSubtitleText — задание / подпись под УСПЕХ
    // ─────────────────────────────────────────────────────────
    const questAreaX = sx(-2);
    const questAreaW = sx(1085);
    const questAreaY = sy(200);

    // «УСПЕХ» — изначально скрыт
    // ──────────────────────────────────────────────────────────
    // СТИЛЬ «УСПЕХ» — редактируйте здесь
    // font-family: Druk Wide Cyr
    // font-weight: 1000 / Super Italic
    // font-size: 100px
    // line-height: 90%  → lineSpacing: sx(-10)
    // color: #EBDFC7
    // ──────────────────────────────────────────────────────────
    this.questSuccessText = this.add.text(
      questAreaX,
      questAreaY,
      "УСПЕХ",
      {
        fontFamily: "Druk Wide Cyr",
        fontSize: `${sx(100)}px`,
        fontStyle: "italic",
        color: "#EBDFC7",
        align: "center",
        lineSpacing: sx(-10),
        letterSpacing: 0
      }
    ).setOrigin(0).setFixedSize(questAreaW, 0).setVisible(false);

    // Начальный текст задания (перед bag)
    // ──────────────────────────────────────────────────────────
    // Этот стиль соответствует оригинальному questText
    // ──────────────────────────────────────────────────────────
    this.questSubtitleText = this.add.text(
      questAreaX,
      questAreaY,
      "УСПЕТЬ В ОФИС\nНА ВАЖНУЮ ВСТРЕЧУ",
      {
        fontFamily: "Druk Wide Cyr",
        fontSize: `${sx(49.16)}px`,
        fontStyle: "bold",
        color: "#E4E5E9",
        align: "center",
        lineSpacing: sx(9.83),
        letterSpacing: sx(1.29)
      }
    ).setOrigin(0).setFixedSize(questAreaW, sy(118));

    // ─────────────────────────────────────────────────────────
    //  ПРОМОКОД
    // ─────────────────────────────────────────────────────────
    const promoX = sx(32);
    const promoY = sy(480);
    const ticketWidth = sx(500);
    const ticketHeight = sy(180);
    const notchRadius = sy(40);
    const centerY = promoY + ticketHeight / 2;

    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(promoX, promoY);
    graphics.lineTo(promoX + ticketWidth, promoY);
    graphics.lineTo(promoX + ticketWidth, centerY - notchRadius);
    graphics.arc(promoX + ticketWidth, centerY, notchRadius, -Math.PI / 2, Math.PI / 2, true);
    graphics.lineTo(promoX + ticketWidth, promoY + ticketHeight);
    graphics.lineTo(promoX, promoY + ticketHeight);
    graphics.lineTo(promoX, centerY + notchRadius);
    graphics.arc(promoX, centerY, notchRadius, Math.PI / 2, -Math.PI / 2, true);
    graphics.closePath();
    graphics.fillPath();

    // Надпись «промокод»
    this.add.text(
      promoX + ticketWidth / 2,
      centerY + sy(40),
      "промокод",
      { fontSize: `${sx(34)}px`, color: "#ffffff" }
    ).setOrigin(0.5);

    // ──────────────────────────────────────────────────────────
    // СТИЛЬ КОДА ПРОМОКОДА — редактируйте здесь
    // font-family: Druk Cyr
    // font-weight: 900, Heavy Italic
    // font-size: 128px
    // line-height: 100%
    // letter-spacing: 0%
    // text-align: center
    // color: #ffffff
    // ──────────────────────────────────────────────────────────
    this.promoCodeText = this.add.text(
      promoX + ticketWidth / 2,
      centerY - sy(40),
      PROMO_STATES.initial,
      {
        fontFamily: "Druk Cyr",
        fontSize: `${sx(80)}px`,
        fontStyle: "italic",   // Heavy Italic
        color: "#ffffff",
        align: "center",
        letterSpacing: 0
      }
    ).setOrigin(0.5).setDepth(2);

    // === СЧЕТ ===
    this.scoreText = this.add.text(
      width - sx(40),
      sy(480),
      "СЧЕТ: 0",
      {
        fontFamily: "Arial",
        fontSize: `${sx(70)}px`,
        fontStyle: "bold italic",
        color: "#E4E5E9"
      }
    ).setOrigin(1, 0);

    // === СЕРДЦА ===
    const heartStartX = width - sx(40);
    const heartY = sy(580);
    for (let i = 0; i < this.lives; i++) {
      const heart = this.add.text(
        heartStartX - i * sx(70),
        heartY,
        "♡",
        { fontSize: `${sx(60)}px`, color: "#E4E5E9" }
      ).setOrigin(1, 0);
      this.hearts.push(heart);
    }

    // === ПОЛЕ ===
    const fieldSize = sx(1080);
    const fieldTop = sy(708);
    const fieldY = fieldTop + fieldSize / 2;

    this.add.rectangle(width / 2, fieldY, fieldSize, fieldSize)
      .setStrokeStyle(1, 0xffffff);

    this.tileSize = fieldSize / this.grid[0].length;
    this.offsetY = fieldTop;

    this.createLevel();

    // === ИГРОК ===
    this.player = this.add.image(0, 0, "player");
    this.player.setDisplaySize(this.tileSize * 0.8, this.tileSize * 0.8);
    this.player.setAngle(180); // машинка направлена вниз

    this.spawnQuestObject("bag");
    this.moveStep();
    this.updatePlayerPosition();

    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  // ─────────────────────────────────────────────────────────
  //  ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ─────────────────────────────────────────────────────────

  private getRandomFreeTile(): { x: number; y: number } {
    const freeTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        if (this.grid[y][x] === 0 && !(x === this.playerPos.x && y === this.playerPos.y)) {
          freeTiles.push({ x, y });
        }
      }
    }
    const idx = Phaser.Math.Between(0, freeTiles.length - 1);
    return freeTiles[idx];
  }

  private spawnQuestObject(key: "bag" | "house" | "vilka") {
    if (this.questObject) {
      this.questObject.destroy();
      this.questObject = null;
    }

    const tile = this.getRandomFreeTile();
    this.questObjectPos = tile;

    const worldX = tile.x * this.tileSize + this.tileSize / 2;
    const worldY = tile.y * this.tileSize + this.tileSize / 2 + this.offsetY;

    this.questObject = this.add.image(worldX, worldY, key);
    this.questObject.setDisplaySize(this.tileSize * 0.9, this.tileSize * 0.9);
    this.questObject.setDepth(1);

    this.tweens.add({
      targets: this.questObject,
      scaleX: this.questObject.scaleX * 1.15,
      scaleY: this.questObject.scaleY * 1.15,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: "Sine.easeInOut"
    });
  }

  /**
   * Показывает «УСПЕХ» + подпись subtitle.
   * Через delay мс скрывает УСПЕХ и выводит nextTask как следующее задание.
   * После этого вызывает onDone().
   */
  private showSuccess(
    subtitle: string,
    nextTask: string,
    delay: number,
    onDone: () => void
  ) {
    const sx = this.sx;
    const sy = this.sy;
    const questAreaY = sy(200);
    const questAreaW = sx(1085);

    // Показываем «УСПЕХ»
    this.questSuccessText.setVisible(true);
    this.questSuccessText.setY(questAreaY);

    // Подпись под УСПЕХ — сдвинута ниже на высоту блока УСПЕХ
    this.questSubtitleText.setStyle({
      fontFamily: "Druk Wide Cyr",
      fontSize: `${sx(38)}px`,
      fontStyle: "bold",
      color: "#EBDFC7",
      align: "center",
      lineSpacing: sx(6),
      letterSpacing: sx(1)
    });
    this.questSubtitleText.setFixedSize(questAreaW, 0);
    this.questSubtitleText.setText(subtitle);
    this.questSubtitleText.setY(questAreaY + this.questSuccessText.height + sy(10));

    // Через delay — переключаемся на следующее задание
    this.time.delayedCall(delay, () => {
      this.questSuccessText.setVisible(false);

      this.questSubtitleText.setStyle({
        fontFamily: "Druk Wide Cyr",
        fontSize: `${sx(49.16)}px`,
        fontStyle: "bold",
        color: "#E4E5E9",
        align: "center",
        lineSpacing: sx(9.83),
        letterSpacing: sx(1.29)
      });
      this.questSubtitleText.setFixedSize(questAreaW, sy(118));
      this.questSubtitleText.setText(nextTask);
      this.questSubtitleText.setY(questAreaY);

      onDone();
    });
  }

  // Обновить промокод и дать вспышку
  private revealPromo(state: "bag" | "house" | "vilka") {
    this.promoCodeText.setText(PROMO_STATES[state]);

    this.tweens.add({
      targets: this.promoCodeText,
      alpha: 0.1,
      yoyo: true,
      duration: 120,
      repeat: 2
    });
  }
	
	
	private showPackshot() {
  const sx = this.sx;
  const sy = this.sy;
  const width = this.scale.width;
  const height = this.scale.height;

  // ── 1. Скрываем всё содержимое сцены ──────────────────────
  this.children.each((child) => {
    (child as Phaser.GameObjects.GameObject & { setVisible?: (v: boolean) => void }).setVisible?.(false);
  });

  // ── 2. Фон ────────────────────────────────────────────────
  const bg = this.add.graphics();
  bg.fillGradientStyle(0x415789, 0x415789, 0x8B9EAA, 0x8B9EAA, 1);
  bg.fillRect(0, 0, width, height);

  // ── 3. Яндекс [лого] Драйв ────────────────────────────────
  const headerY = sy(55);
  const fontSize = sx(80);
  const gap = sx(15);
  const logoSize = sx(60);

  const yandexText = this.add.text(sx(76), headerY, "Яндекс", {
    fontFamily: "Yandex Sans Text",
    fontSize: `${fontSize}px`,
    fontStyle: "bold",
    color: "#E4E5E9",
  }).setOrigin(0, 0);

  const logoX = sx(76) + yandexText.width + gap;
  const logoY = headerY + fontSize / 2;
  this.add.image(logoX, logoY, "logo")
    .setOrigin(0, 0.5)
    .setDisplaySize(logoSize, logoSize);

  const driveX = logoX + logoSize + gap;
  this.add.text(driveX, headerY, "Драйв", {
    fontFamily: "Yandex Sans Text",
    fontSize: `${fontSize}px`,
    fontStyle: "bold",
    color: "#E4E5E9",
  }).setOrigin(0, 0);

  // ── 4. Машинка — въезжает слева ───────────────────────────
  const carTargetX = width / 2;
  const carY = height * 0.55;

  const car = this.add.image(-sx(300), carY, "automob")
    .setDisplaySize(sx(800), sy(400))
    .setAngle(0); // боком

  this.tweens.add({
    targets: car,
    x: carTargetX,
    duration: 900,
    ease: "Cubic.easeOut",
    onComplete: () => {
      // ── 5. Надпись «ВЫВОЗИТЕ НА ДРАЙВЕ» ──────────────────
      const headlineY = sy(320);
      const headline = this.add.text(
        width / 2,
        headlineY,
        "ВЫВОЗИТЕ\nНА ДРАЙВЕ",
        {
          fontFamily: "Druk Wide Cyr",
          fontSize: `${sx(96.88)}px`,
          fontStyle: "italic",
          
          color: "#EBDFC7",
          align: "center",
          lineSpacing: 0,
          letterSpacing: 0,
        }
      ).setOrigin(0.5, 0).setAlpha(0);
	
	  // ── Текст под машинкой: «Доступно и в ЯндексGo» ──────────
  const yandexGoText = this.add.text(
    width / 2,
    carY + sy(200) + sy(10),
    "ДОСТУПНО И В ЯНДЕКСGO",
    {
      fontFamily: "Druk Text Wide Cyr",
      fontSize: `${sx(33.4)}px`,
      fontStyle: "normal",
      color: "#E4E5E9",
      align: "center",
      lineSpacing: sx(33.4 * 0.1), // line-height 110%
      letterSpacing: 0,
    }
  ).setOrigin(0.5, 0).setAlpha(0);

  // ── Дисклеймер ────────────────────────────────────────────
  const disclaimerY = yandexGoText.y + yandexGoText.height + sy(12);
  const disclaimerText = this.add.text(
    sx(32),
    disclaimerY,
    'Скидка 25% на 2 недели с даты регистрации в сервисе "Яндекс.Драйв" и доп. скидка 25% по промокоду DRIVEGO5 на первые 5 поездок в сервисе в Базовых тарифах. Срок активации промокода с 01.02.2025 до 11.05.2025. Только для впервые зарегистрировавшихся пользователей. Не азартная игра. Промокод выдается за игру в 15 секунд. Условия использования промокодов: yandex.ru/legal/drive_promocode/ Условия использования сервиса Яндекс Драйв: yandex.ru/legal/drive_termsofuse. Реклама ООО "Яндекс.Драйв" (ОГРН 5177746277385). 0+',
    {
      fontFamily: "YS Display",
      fontSize: `${sx(24)}px`,
      fontStyle: "normal",
      color: "#E4E5E9",
      align: "left",
      lineSpacing: 0, // line-height 100%
      letterSpacing: 0,
      wordWrap: { width: width - sx(64) },
    }
  ).setOrigin(0, 0).setAlpha(0);

  // Появление обоих текстов
  this.tweens.add({
    targets: [yandexGoText, disclaimerText],
    alpha: 1,
    duration: 400,
    ease: "Sine.easeOut",
  });
		
      this.tweens.add({
        targets: headline,
        alpha: 1,
        duration: 500,
        ease: "Sine.easeOut",
        onComplete: () => {
          // ── 6. Блок с промокодом ──────────────────────────
          const promoBlockY = headline.y + headline.height + sy(40);
          const ticketWidth = sx(500);
          const ticketHeight = sy(180);
          const notchRadius = sy(40);
          const promoX = width / 2 - ticketWidth / 2;
          const centerY = promoBlockY + ticketHeight / 2;

          const promoGraphics = this.add.graphics().setAlpha(0);
          promoGraphics.fillStyle(0x000000, 1);
          promoGraphics.beginPath();
          promoGraphics.moveTo(promoX, promoBlockY);
          promoGraphics.lineTo(promoX + ticketWidth, promoBlockY);
          promoGraphics.lineTo(promoX + ticketWidth, centerY - notchRadius);
          promoGraphics.arc(promoX + ticketWidth, centerY, notchRadius, -Math.PI / 2, Math.PI / 2, true);
          promoGraphics.lineTo(promoX + ticketWidth, promoBlockY + ticketHeight);
          promoGraphics.lineTo(promoX, promoBlockY + ticketHeight);
          promoGraphics.lineTo(promoX, centerY + notchRadius);
          promoGraphics.arc(promoX, centerY, notchRadius, Math.PI / 2, -Math.PI / 2, true);
          promoGraphics.closePath();
          promoGraphics.fillPath();

          const promoLabel = this.add.text(
            width / 2,
            centerY + sy(40),
            "промокод",
            { fontSize: `${sx(34)}px`, color: "#ffffff" }
          ).setOrigin(0.5).setAlpha(0);

          const promoCode = this.add.text(
            width / 2,
            centerY - sy(40),
            PROMO_STATES.vilka,
            {
              fontFamily: "Druk Cyr",
              fontSize: `${sx(80)}px`,
              fontStyle: "italic",
              color: "#ffffff",
              align: "center",
              letterSpacing: 0,
            }
          ).setOrigin(0.5).setDepth(2).setAlpha(0);

          this.tweens.add({
            targets: [promoGraphics, promoLabel, promoCode],
            alpha: 1,
            duration: 400,
            ease: "Sine.easeOut",
          });
        },
      });
    },
  });
}
  // ─────────────────────────────────────────────────────────
  //  УРОВЕНЬ
  // ─────────────────────────────────────────────────────────
  private createLevel() {
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const worldX = x * this.tileSize + this.tileSize / 2;
        const worldY = y * this.tileSize + this.tileSize / 2 + this.offsetY;

        if (this.grid[y][x] === 1) {
          this.add.rectangle(worldX, worldY, this.tileSize, this.tileSize, 0x415789)
            .setStrokeStyle(1, 0xffffff);
        } else {
          const coin = this.add.image(worldX, worldY, "coin");
          coin.setDisplaySize(this.tileSize * 0.6, this.tileSize * 0.6);
          this.pellets.push(coin);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  УПРАВЛЕНИЕ
  // ─────────────────────────────────────────────────────────
  update(_time: number) {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) this.setDirection(-1, 0);
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) this.setDirection(1, 0);
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) this.setDirection(0, -1);
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) this.setDirection(0, 1);
  }

  private setDirection(x: number, y: number) {
    this.direction.x = x;
    this.direction.y = y;

    // Поворот машинки (исходно направлена вниз = 180°)
    if (x === 1  && y === 0)  this.player.setAngle(-90);
    if (x === -1 && y === 0)  this.player.setAngle(90);
    if (x === 0  && y === -1) this.player.setAngle(180);
    if (x === 0  && y === 1)  this.player.setAngle(0);
  }

  // ─────────────────────────────────────────────────────────
  //  ДВИЖЕНИЕ
  // ─────────────────────────────────────────────────────────
  private moveStep() {
    if (this.direction.x === 0 && this.direction.y === 0) {
      this.time.delayedCall(50, () => this.moveStep());
      return;
    }

    const newX = this.playerPos.x + this.direction.x;
    const newY = this.playerPos.y + this.direction.y;

    if (this.grid[newY][newX] === 1) {
      this.loseLife();
      this.direction = { x: 0, y: 0 };
      this.time.delayedCall(100, () => this.moveStep());
      return;
    }

    this.playerPos.x = newX;
    this.playerPos.y = newY;

    const worldX = newX * this.tileSize + this.tileSize / 2;
    const worldY = newY * this.tileSize + this.tileSize / 2 + this.offsetY;

    this.tweens.add({
      targets: this.player,
      x: worldX,
      y: worldY,
      duration: 300,
      ease: "Linear",
      onComplete: () => {
        this.checkPelletCollision();
        this.checkQuestCollision();
        this.moveStep();
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  КВЕСТ-КОЛЛИЗИЯ
  // ─────────────────────────────────────────────────────────
  private checkQuestCollision() {
    if (!this.questObject || this.questStage === "done") return;
    if (this.playerPos.x !== this.questObjectPos.x || this.playerPos.y !== this.questObjectPos.y) return;

    this.questObject.destroy();
    this.questObject = null;

    if (this.questStage === "bag") {
      this.questStage = "house";
      this.revealPromo("bag");
      this.showSuccess(
        "машина была заправлена,\nвы приехали вовремя",
        "по дороге с работы\nзаехать в магазин",
        1500,
        () => this.spawnQuestObject("house")
      );

    } else if (this.questStage === "house") {
      this.questStage = "vilka";
      this.revealPromo("house");
      this.showSuccess(
        "Все покупки влезли в багажник",
        "доехать в центр\nна встречу с друзьями",
        1500,
        () => this.spawnQuestObject("vilka")
      );

    } else if (this.questStage === "vilka") {
  this.questStage = "done";
  this.revealPromo("vilka");
  this.showSuccess(
    "Бонус, бесплатная парковка",
    "",
    2000,
    () => this.showPackshot()   // ← было: this.scene.restart()
  );
}
  }

  // ─────────────────────────────────────────────────────────
  //  ЖИЗНИ / МОНЕТЫ
  // ─────────────────────────────────────────────────────────
  private loseLife() {
    /*
    this.lives--;
    const heart = this.hearts.pop();
    if (heart) heart.destroy();
    if (this.lives <= 0) this.scene.restart();
    */
  }

  private updatePlayerPosition() {
    const worldX = this.playerPos.x * this.tileSize + this.tileSize / 2;
    const worldY = this.playerPos.y * this.tileSize + this.tileSize / 2 + this.offsetY;
    this.player.setPosition(worldX, worldY);
  }

  private checkPelletCollision() {
    const px = this.playerPos.x;
    const py = this.playerPos.y;

    this.pellets = this.pellets.filter(coin => {
      const gridX = Math.floor(coin.x / this.tileSize);
      const gridY = Math.floor((coin.y - this.offsetY) / this.tileSize);

      if (gridX === px && gridY === py) {
        coin.destroy();
        this.score += 100;
        this.scoreText.setText(`СЧЕТ: ${this.score}`);
        return false;
      }
      return true;
    });
  }
}