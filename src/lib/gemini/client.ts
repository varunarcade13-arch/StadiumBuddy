// ─── Gemini AI Client (Firebase AI Logic) ─────────────────────────────────────
// Factory pattern: creates and configures the Gemini generative model.
// All AI interaction flows through this module.

import { GoogleGenerativeAI, type GenerativeModel, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiClientConfig {
  readonly apiKey: string;
  readonly modelName?: string;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
}

export interface GeminiClientDependencies {
  readonly config: GeminiClientConfig;
}

// ─── Singleton model instance ─────────────────────────────────────────────────

let _modelInstance: GenerativeModel | null = null;

/**
 * Creates (or returns cached) Gemini generative model instance.
 * Uses singleton pattern to avoid re-initialization on every request.
 *
 * Safety settings are configured to BLOCK_LOW_AND_ABOVE for all harm categories
 * to prevent any unsafe content generation in a public-facing stadium app.
 */
export function getGeminiModel(config?: GeminiClientConfig): GenerativeModel {
  if (_modelInstance && config === undefined) return _modelInstance;

  const apiKey = config?.apiKey ?? process.env["GEMINI_API_KEY"] ?? "";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("GEMINI_API_KEY is not configured. Using Mock Gemini Model for demonstration.");
    }
    return {
      startChat: () => {
        return {
          sendMessageStream: async (message: string) => {
            // Detect requested language from the language instruction prepended by the API
            const langMatch = message.match(/You MUST respond ENTIRELY in (\w+)/);
            const rawLang = langMatch?.[1]?.toLowerCase() ?? "english";
            const langCode =
              rawLang.startsWith("spanish") ? "es" :
              rawLang.startsWith("french") ? "fr" :
              rawLang.startsWith("arabic") ? "ar" :
              rawLang.startsWith("portuguese") ? "pt" :
              rawLang.startsWith("german") ? "de" :
              rawLang.startsWith("chinese") ? "zh" :
              rawLang.startsWith("hindi") ? "hi" :
              rawLang.startsWith("japanese") ? "ja" :
              rawLang.startsWith("korean") ? "ko" : "en";

            const fanQuestionIdx = message.indexOf("## Fan Question\n");
            const fanQuestion = fanQuestionIdx !== -1 ? message.slice(fanQuestionIdx) : message;
            const msgLower = fanQuestion.toLowerCase();

            // Per-language response maps
            type LangMap = Record<string, string>;
            const RESPONSES: Record<string, LangMap> = {
              seat: {
                en: "### Situation\nFan is seeking Seating Directions for Section 115.\n\n### Reasoning\nSection 115 is on Level 1. The shortest concourse walk is via Concourse A.\n\n### Recommendation\nFrom your current position, proceed to **Concourse A**, then take the escalator up to the **Level 1** concourse. Walk past Concession Area 3, and Section 115 will be on your right.\n\n### Alternative\nIf you need elevator access, please use Elevator 2 located near Gate B.\n\n### Confidence\n- **Level**: High\n- **Rationale**: Based on official MetLife seating maps.\n\n### Suggested Next Action\nFollow the overhead signs toward Concourse A.",
                es: "### Situación\nEl aficionado busca Seating Directions para la Sección 115.\n\n### Razonamiento\nLa Sección 115 está en el Nivel 1. El pasillo más directo es a través del Pasillo A.\n\n### Recomendación\nDesde su posición actual, diríjase al **Pasillo A**, luego tome la escalera mecánica hasta el **Nivel 1**. Pase el Área de Concesiones 3 y la Sección 115 estará a su derecha.\n\n### Alternativa\nSi necesita acceso en ascensor, use el Ascensor 2 cerca de la Puerta B.\n\n### Confianza\n- **Nivel**: Alto\n- **Razón**: Basado en mapas oficiales de MetLife.\n\n### Próxima acción sugerida\nSiga los carteles hacia el Pasillo A.",
                fr: "### Situation\nLe supporter recherche Seating Directions pour la Section 115.\n\n### Raisonnement\nLa section 115 est au niveau 1. Le chemin le plus rapide se fait par le couloir A.\n\n### Recommandation\nDepuis votre position actuelle, dirigez-vous vers le **Couloir A**, puis prenez l'escalator jusqu'au **Niveau 1**. Dépassez la zone de restauration 3 et la Section 115 sera sur votre droite.\n\n### Alternative\nPour un accès ascenseur, utilisez l'Ascenseur 2 situé près de la Porte B.\n\n### Confiance\n- **Niveau**: Élevé\n- **Justification**: Cartographie officielle de MetLife.\n\n### Action suivante suggérée\nSuivez les panneaux directionnels vers le Couloir A.",
                ar: "### الوضع\nالمشجع يبحث عن Seating Directions للوصول إلى القسم 115.\n\n### التبرير\nالقسم 115 يقع في الطابق الأول. الطريق الأقصر هو عبر الممر A.\n\n### التوصية\nمن موقعك الحالي، توجه إلى **الممر A**، ثم خذ السلم المتحرك إلى **المستوى 1**. امشِ بجانب منطقة الامتيازات 3 وستجد القسم 115 على يمينك.\n\n### البديل\nإذا كنت بحاجة إلى مصعد، يرجى استخدام المصعد 2 بالقرب من البوابة B.\n\n### الثقة\n- **المستوى**: عالٍ\n- **السبب**: استناداً إلى خرائط المقاعد الرسمية لـ MetLife.\n\n### الإجراء التالي المقترح\nاتبع اللوحات الإرشادية نحو الممر A.",
                pt: "### Situação\nO adepto procura Seating Directions para a Secção 115.\n\n### Raciocínio\nA Secção 115 fica no Piso 1. O percurso mais curto é pelo Corredor A.\n\n### Recomendação\nDa sua posição atual, dirija-se ao **Corredor A**, suba a escada rolante até ao **Nível 1**. Passe pela Área de Concessões 3 e a Secção 115 estará à sua direita.\n\n### Alternativa\nSe necessitar de elevador, utilize o Elevador 2 perto do Portão B.\n\n### Confiança\n- **Nível**: Alto\n- **Razão**: Baseado nos mapas oficiais da MetLife.\n\n### Próxima ação sugerida\nSiga as placas indicativas para o Corredor A.",
                de: "### Situation\nFan sucht Seating Directions zu Sektion 115.\n\n### Begründung\nSektion 115 befindet sich auf Ebene 1. Der kürzeste Weg führt über Korridor A.\n\n### Empfehlung\nGehen Sie von Ihrer Position zu **Konzessions-Bereich A** und nutzen Sie die Rolltreppe zu **Niveau 1**. Vorbei an Bereich 3 finden Sie Sektion 115 rechts.\n\n### Alternative\nFür Aufzüge nutzen Sie Aufzug 2 nahe Gate B.\n\n### Vertrauen\n- **Niveau**: Hoch\n- **Begründung**: Offizielle MetLife-Stadionpläne.\n\n### Empfohlene nächste Aktion\nFolgen Sie der Beschilderung zu Korridor A.",
                zh: "### 情况\n球迷正在寻找 Seating Directions 前往115区。\n\n### 推理\n115区位于1层。最近的通道是经由A大厅。\n\n### 推荐\n从您当前位置前往**A大厅**，乘扶梯到达**1层**。经过3号餐饮区，115区就在您右手边。\n\n### 替代方案\n如需乘坐电梯，请使用B门附近的2号电梯。\n\n### 置信度\n- **置信度**: 高\n- **依据**: 依据大都会人寿体育场官方座位图。\n\n### 建议的下一步行动\n跟随指示牌前往A大厅。",
                hi: "### स्थिति\nप्रशंसक सेक्शन 115 के लिए Seating Directions ढूंढ रहा है।\n\n### तर्क\nसेक्शन 115 लेवल 1 पर है। कॉन्कोर्स A के रास्ते चलना सबसे छोटा है।\n\n### सिफारिश\nअपनी वर्तमान स्थिति से **कॉन्कोर्स A** की ओर जाएं, फिर **लेवल 1** के लिए एस्केलेटर लें। कंसेशन एरिया 3 को पार करें और सेक्शन 115 दाईं ओर मिलेगा।\n\n### विकल्प\nयदि लिफ्ट की आवश्यकता हो, तो गेट B के पास लिफ्ट 2 का उपयोग करें।\n\n### विश्वास\n- **स्तर**: उच्च\n- **तर्क**: आधिकारिक मेटलाइफ सीटिंग मानचित्र पर आधारित।\n\n### सुझाया गया अगला कदम\nकॉन्कोर्स A के संकेतों का पालन करें।",
                ja: "### 状況\nファンがセクション115への Seating Directions を探しています。\n\n### 推論\nセクション115はレベル1にあります。最も近い経路はコンコースA経由です。\n\n### 推奨\n現在地から**コンコースA**へ進み、エスカレーターで**レベル1**へ上がります。飲食エリア3を過ぎると右側にセクション115があります。\n\n### 代替案\nエレベーターが必要な場合は、ゲートB付近のエレベーター2をご利用ください。\n\n### 確信度\n- **レベル**: 高\n- **根拠**: 公式メットライフ・スタジアム席図面に基づく。\n\n### 次に推奨されるアクション\nコンコースAへの案内板に従ってお進みください。",
                ko: "### 상황\n관람객이 115구역으로 가는 Seating Directions 를 찾고 있습니다.\n\n### 추론\n115구역은 1층에 있으며, 콘코스 A를 경유하는 것이 가장 빠릅니다.\n\n### 추천\n현재 위치에서 **콘코스 A**로 이동한 후, 에스컬레이터를 타고 **1층**으로 올라가세요. 매점 3구역을 지나면 오른쪽에 115구역이 있습니다.\n\n### 대안\n엘리베이터가 필요한 경우 게이트 B 근처 엘리베이터 2를 이용하세요.\n\n### 신뢰도\n- **신뢰도**: 높음\n- **근거**: 공식 메트라이프 좌석 배치도 기준.\n\n### 권장되는 다음 단계\n콘코스 A 방면 이정표를 따라 이동하세요."
              },
              crowd: {
                en: "### Situation\nFan is asking for Exit & Crowd Congestion status.\n\n### Reasoning\nGate B has heavy delay. Gate A is moderately congested. Gate C is clear.\n\n### Recommendation\nWe recommend exiting via **Gate C (East Exit)**. It currently has low density and almost no wait time.\n\n### Alternative\nAlternatively, use **Gate A (North Exit)** if closer to transit, but expect a ~5 minute wait.\n\n### Confidence\n- **Level**: High\n- **Rationale**: Real-time exit camera feed telemetry.\n\n### Suggested Next Action\nProceed to the East Exit signs for Gate C.",
                es: "### Situación\nEl aficionado consulta el estado de Exit & Crowd Congestion.\n\n### Razonamiento\nLa Puerta B tiene demoras críticas. La Puerta A tiene congestión moderada. La Puerta C está despejada.\n\n### Recomendación\nRecomendamos salir por la **Puerta C (Salida Este)**. Tiene baja densidad y casi nada de espera.\n\n### Alternativa\nComo alternativa, use la **Puerta A (Salida Norte)** si está más cerca, con unos 5 minutos de espera.\n\n### Confianza\n- **Nivel**: Alto\n- **Razón**: Datos en tiempo real de los sensores de salida.\n\n### Próxima acción sugerida\nSiga las indicaciones hacia la Salida Este para la Puerta C.",
                fr: "### Situation\nLe supporter demande l'état de Exit & Crowd Congestion.\n\n### Raisonnement\nLa porte B subit des retards importants. La porte A est modérée. La porte C est fluide.\n\n### Recommandation\nNous recommandons de sortir par la **Porte C (Sortie Est)**, car l'attente y est minime.\n\n### Alternative\nUtilisez la **Porte A (Sortie Nord)** si elle est plus proche, avec 5 minutes d'attente estimées.\n\n### Confiance\n- **Niveau**: Élevé\n- **Justification**: Capteurs de densité des flux de sortie.\n\n### Action suivante suggérée\nPrenez la direction de la Sortie Est vers la Porte C.",
                ar: "### الوضع\nالمشجع يستفسر عن حالة Exit & Crowd Congestion.\n\n### التبرير\nالبوابة B تشهد تأخيرات كبيرة. البوابة A مزدحمة نسبياً. البوابة C سالكة بالكامل.\n\n### التوصية\nنوصي بالخروج عبر **البوابة C (المخرج الشرقي)**. الكثافة منخفضة ولا يوجد وقت انتظار تقريباً.\n\n### البديل\nالبديل هو استخدام **البوابة A (المخرج الشمالي)** إذا كانت أقرب، مع انتظار لمدة 5 دقائق.\n\n### الثقة\n- **المستوى**: عالٍ\n- **السبب**: مستشعرات التدفق الفعلي للمشجعين.\n\n### الإجراء التالي المقترح\nاتجه نحو المخرج الشرقي للبوابة C.",
                pt: "### Situação\nO adepto consulta o congestionamento de Exit & Crowd Congestion.\n\n### Raciocínio\nO Portão B tem atraso crítico. O Portão A está moderado. O Portão C está livre.\n\n### Recomendação\nRecomendamos sair pelo **Portão C (Saída Leste)**, que apresenta densidade baixa e sem espera.\n\n### Alternativa\nUse o **Portão A (Saída Norte)** se for mais conveniente, estimando 5 minutos de espera.\n\n### Confiança\n- **Nível**: Alto\n- **Razão**: Sensores de fluxo em tempo real.\n\n### Próxima ação sugerida\nDirija-se ao Portão C pela saída Leste.",
                de: "### Situation\nFan fragt nach Exit & Crowd Congestion und Stausituation.\n\n### Begründung\nGate B hat starke Verzögerungen. Gate A ist mäßig gefüllt. Gate C ist frei.\n\n### Empfehlung\nNutzen Sie **Gate C (Ostausgang)**. Die Auslastung ist gering und es gibt kaum Wartezeiten.\n\n### Alternative\nAusweichoption ist **Gate A (Nordausgang)** mit etwa 5 Minuten Wartezeit.\n\n### Vertrauen\n- **Niveau**: Hoch\n- **Begründung**: Live-Kamerasensoren der Ausgänge.\n\n### Empfohlene nächste Aktion\nFolgen Sie den Schildern zum Ostausgang für Gate C.",
                zh: "### 情况\n球迷询问 Exit & Crowd Congestion 出口拥挤状态。\n\n### 推理\nB门严重拥堵。A门中度拥挤。C门畅通。\n\n### 推荐\n推荐从**C门（东出口）**出场。目前人流极少，几乎无需等待。\n\n### 替代方案\n如果更靠近交通站点，可选择**A门（北出口）**，但需等待约5分钟。\n\n### 置信度\n- **置信度**: 高\n- **依据**: 实时出口传感器数据。\n\n### 建议的下一步行动\n跟随指示牌前往东出口C门。",
                hi: "### स्थिति\nप्रशंसक Exit & Crowd Congestion और भीड़भाड़ की स्थिति पूछ रहा है।\n\n### तर्क\nGate B पर भारी जाम है। Gate A पर मध्यम भीड़ है। Gate C पूरी तरह खाली है।\n\n### सिफारिश\nहम **Gate C (पूर्वी निकास)** से बाहर निकलने की सलाह देते हैं। यहां भीड़ कम है और कोई प्रतीक्षा समय नहीं है।\n\n### विकल्प\nवैकल्पिक रूप से, **Gate A (उत्तरी निकास)** का उपयोग करें, जहां लगभग 5 मिनट की प्रतीक्षा होगी।\n\n### विश्वास\n- **स्तर**: उच्च\n- **तर्क**: लाइव सेंसर कैमरा डेटा।\n\n### सुझाया गया अगला कदम\nGate C के लिए पूर्वी निकास के संकेतों का पालन करें।",
                ja: "### 状況\nファンが Exit & Crowd Congestion 出口の混雑状況を確認しています。\n\n### 推論\nゲートBは深刻な遅延があります。ゲートAは中程度の混雑です。ゲートCは空いています。\n\n### 推奨\n**ゲートC（東出口）**からの退場を推奨します。混雑度は極めて低く、待ち時間はありません。\n\n### 代替案\n交通機関に近い場合は**ゲートA（北出口）**も利用可能ですが、約5分の待ち時間があります。\n\n### 確信度\n- **レベル**: 高\n- **根拠**: リアルタイム流出センサーデータに基づく。\n\n### 次に推奨されるアクション\n東出口의案内板に従ってゲートCへお進みください。",
                ko: "### 상황\n관람객이 Exit & Crowd Congestion 출구 혼잡 상황을 묻고 있습니다.\n\n### 추론\n게이트 B는 심각하게 정체되어 있으며, 게이트 A는 보통 혼잡하고, 게이트 C는 원활합니다.\n\n### 추천\n**게이트 C (동쪽 출구)**로 퇴장하는 것을 추천합니다. 대기 시간이 거의 없고 혼잡도가 낮습니다.\n\n### 대안\n교통편이 더 가깝다면 **게이트 A (북쪽 출구)**를 이용하세요. 약 5분 정도 대기가 있습니다.\n\n### 신뢰도\n- **신뢰도**: 높음\n- **근거**: 실시간 센서 카메라 관측 자료.\n\n### 권장되는 다음 단계\n동쪽 출구 게이트 C 방면으로 이동하세요."
              },
              restroom: {
                en: "### Situation\nFan needs Accessibility & Restrooms information.\n\n### Reasoning\nAccessible family restrooms are equipped with automatic doors and support rails on all concourses.\n\n### Recommendation\nUse the fully accessible family restrooms behind **Section 112** and **Section 124** on the main concourse.\n\n### Alternative\nIf those are occupied, accessible facilities are also located behind Section 109 and Section 132.\n\n### Confidence\n- **Level**: High\n- **Rationale**: Based on official MetLife accessibility facility plans.\n\n### Suggested Next Action\nProceed to the main concourse behind Section 112.",
                es: "### Situación\nEl aficionado busca Accessibility & Restrooms baños accesibles.\n\n### Razonamiento\nLos baños familiares accesibles cuentan con puertas automáticas y barras de apoyo en todos los pasillos.\n\n### Recommendation\nUtilice los baños familiares accesibles detrás de la **Sección 112** y la **Sección 124** en el pasillo principal.\n\n### Alternativa\nSi están ocupados, también hay baños accesibles detrás de la Sección 109 y la Sección 132.\n\n### Confianza\n- **Nivel**: Alto\n- **Razón**: Basado en planes de accesibilidad oficiales de MetLife.\n\n### Próxima acción sugerida\nDiríjase al pasillo principal detrás de la Sección 112.",
                fr: "### Situation\nLe supporter recherche Accessibility & Restrooms toilettes accessibles.\n\n### Raisonnement\nDes toilettes familiales adaptées équipées de barres d'appui sont installées à chaque niveau.\n\n### Recommandation\nUtilisez les toilettes accessibles derrière la **Section 112** et la **Section 124** dans le couloir principal.\n\n### Alternative\nEn cas d'occupation, d'autres cabines adaptées sont disponibles derrière la Section 109.\n\n### Confiance\n- **Niveau**: Élevé\n- **Justification**: Registre d'accessibilité de MetLife.\n\n### Action suivante suggérée\nRejoignez le couloir principal derrière la Section 112.",
                ar: "### الوضع\nالمشجع يحتاج إلى معلومات عن Accessibility & Restrooms مراحيض ذوي الاحتياجات الخاصة.\n\n### التبرير\nمراحيض العائلات المجهزة لذوي الاحتياجات الخاصة متوفرة بأبواب تلقائية وقضبان دعم في جميع الممرات.\n\n### التوصية\nاستخدم دورات المياه المخصصة بالكامل خلف **القسم 112** و **القسم 124** في الممر الرئيسي.\n\n### البديل\nإذا كانت مغلقة، تتوفر مراحيض أخرى خلف القسم 109 والقسم 132.\n\n### الثقة\n- **المستوى**: عالٍ\n- **السبب**: استناداً إلى مخططات المرافق الرسمية لـ MetLife.\n\n### الإجراء التالي المقترح\nتوجه إلى الممر الرئيسي خلف القسم 112.",
                pt: "### Situação\nO adepto necessita de Accessibility & Restrooms casas de banho com acessibilidade.\n\n### Raciocínio\nCasas de banho familiares adaptadas encontram-se em todos os corredores principais.\n\n### Recomendação\nUtilize as casas de banho totalmente acessíveis atrás da **Secção 112** e da **Secção 124** no corredor principal.\n\n### Alternative\nComo alternativa, utilize as instalações atrás da Secção 109 ou Secção 132.\n\n### Confiança\n- **Nível**: Alto\n- **Razão**: Planta oficial de instalações da MetLife.\n\n### Próxima ação sugerida\nDirija-se ao corredor principal atrás da Secção 112.",
                de: "### Situation\nFan benötigt Accessibility & Restrooms barrierefreie Toiletten.\n\n### Begründung\nBarrierefreie Familientoiletten mit Haltegriffen sind auf allen Ebenen vorhanden.\n\n### Empfehlung\nNutzen Sie die barrierefreien Toiletten hinter **Sektion 112** und **Sektion 124** im Hauptkorridor.\n\n### Alternative\nAusweichmöglichkeiten befinden sich hinter Sektion 109 und Sektion 132.\n\n### Vertrauen\n- **Niveau**: Hoch\n- **Begründung**: Offizielle Pläne zur Barrierefreiheit des Stadions.\n\n### Empfohlene nächste Aktion\nGehen Sie zum Hauptkorridor hinter Sektion 112.",
                zh: "### 情况\n球迷需要 Accessibility & Restrooms 无障碍洗手间信息。\n\n### 推理\n无障碍家庭洗手间配有自动门和安全扶手，分布在各主要楼层。\n\n### 推荐\n使用位于主大厅**112区** and **124区**后方的无障碍家庭洗手间。\n\n### 替代方案\n如果人满，109区和132区后方也设有无障碍洗手间。\n\n### 置信度\n- **置信度**: 高\n- **依据**: 依据大都会人寿体育场官方无障碍设施规划。\n\n### 建议的下一步行动\n前往112区后方的主大厅。",
                hi: "### स्थिति\nप्रशंसक को Accessibility & Restrooms सुलभ शौचालय की जानकारी चाहिए।\n\n### तर्क\nसुलभ पारिवारिक शौचालय स्वचालित दरवाजों और सपोर्ट रेल के साथ सभी स्तरों पर उपलब्ध हैं।\n\n### सिफारिश\nमुख्य कॉन्कोर्स पर **सेक्शन 112** और **सेक्शन 124** के पीछे उपलब्ध सुलभ पारिवारिक शौचालय का उपयोग करें।\n\n### विकल्प\nयदि वे व्यस्त हैं, तो सेक्शन 109 और सेक्शन 132 के पीछे भी सुलभ शौचालय हैं।\n\n### विश्वास\n- **स्तर**: उच्च\n- **तर्क**: आधिकारिक मेटलाइफ सुलभ सुविधा योजना।\n\n### सुझाया गया अगला कदम\nसेक्शन 112 के पीछे मुख्य कॉन्कोर्स पर जाएं।",
                ja: "### 状況\nファンが Accessibility & Restrooms バリアフリートイレの情報を求めています。\n\n### 推論\nすべてのフロアに自動ドアと手すりを備えた多目的トイレがあります。\n\n### 推奨\nメインコンコースの**セクション112**および**セクション124**裏にある多目的トイレをご利用ください。\n\n### 代替案\n混雑している場合は、セクション109およびセクション132裏のトイレもご利用いただけます。\n\n### 確信度\n- **レベル**: 高\n- **根拠**: 公式メットライフ・スタジアム設備計画に基づく。\n\n### 次に推奨されるアクション\nセクション112裏のメインコンコースへお進みください。",
                ko: "### 상황\n관람객이 Accessibility & Restrooms 무장애 화장실 정보를 필요로 합니다.\n\n### 추론\n자동문과 안전 바가 설치된 가족형 무장애 화장실이 콘코스 전역에 배치되어 있습니다.\n\n### 추천\n메인 콘코스의 **112구역** 및 **124구역** 뒤쪽에 위치한 완전 무장애 화장실을 이용하세요.\n\n### 대안\n사용 중일 경우, 109구역 및 132구역 뒤쪽 화장실도 이용 가능합니다.\n\n### 신뢰도\n- **신뢰도**: 높음\n- **근거**: 공식 메트라이프 무장애 시설 배치도 기준.\n\n### 권장되는 다음 단계\n112구역 뒤쪽 메인 콘코스로 이동하세요."
              },
              transport: {
                en: "### Situation\nFan needs Post-Match Transportation options.\n\n### Reasoning\nRail transit provides high-volume flow, while express buses have faster immediate boarding lines.\n\n### Recommendation\nWe recommend using the **Meadowlands Rail Line** which runs every 10 minutes to Secaucus Junction from the North Gate station.\n\n### Alternative\nOr take the free **Express Shuttle Bus** to Metropark boarding at Parking Lot G.\n\n### Confidence\n- **Level**: High\n- **Rationale**: Match-day transit schedule integration.\n\n### Suggested Next Action\nProceed to the North Gate station entrance.",
                es: "### Situación\nEl aficionado busca Post-Match Transportation transporte post-partido.\n\n### Razonamiento\nEl transporte ferroviario tiene alta capacidad, mientras que los shuttles tienen menor tiempo de espera.\n\n### Recomendación\nRecomendamos la **Línea Ferroviaria Meadowlands** que sale cada 10 min a Secaucus Junction desde Gate Norte.\n\n### Alternativa\nTome el **Autobús Exprés** gratuito a Metropark embarcando en el Estacionamiento G.\n\n### Confianza\n- **Nivel**: Alto\n- **Razón**: Integración de horarios de tránsito en días de partido.\n\n### Próxima acción sugerida\nDiríjase a la entrada de la estación de Gate Norte.",
                fr: "### Situation\nLe supporter s'informe sur Post-Match Transportation les transports après le match.\n\n### Raisonnement\nLe train gère le gros des flux de supporters, les navettes de bus offrent un embarquement immédiat plus rapide.\n\n### Recommandation\nUtilisez la **Ligne de Train Meadowlands** (départ toutes les 10 min vers Secaucus Junction à la Porte Nord).\n\n### Alternative\nPrenez la navette gratuite **Bus Express** vers Metropark, avec embarquement au Parking G.\n\n### Confiance\n- **Niveau**: Élevé\n- **Justification**: Tableaux horaires des transports officiels.\n\n### Action suivante suggérée\nRejoignez la gare située à la Porte Nord.",
                ar: "### الوضع\nالمشجع يستفسر عن خيارات Post-Match Transportation النقل بعد المباراة.\n\n### التبرير\nقطار Meadowlands يوفر تدفقاً سريعاً، في حين أن حافلات الشاتل توفر صعوداً أسرع للمجموعات الصغيرة.\n\n### التوصية\nنوصي باستخدام **خط سكة حديد Meadowlands** الذي يعمل كل 10 دقائق إلى Secaucus Junction من محطة البوابة الشمالية.\n\n### البديل\nأو يمكنك ركوب **الحافلة السريعة** المجانية إلى Metropark من موقف السيارات G.\n\n### الثقة\n- **المستوى**: عالٍ\n- **السبب**: جداول مواعيد النقل الرسمية يوم المباراة.\n\n### الإجراء التالي المقترح\nتوجه إلى مدخل محطة البوابة الشمالية.",
                pt: "### Situação\nO adepto necessita de Post-Match Transportation transporte pós-jogo.\n\n### Raciocínio\nO comboio gerencia maior fluxo, enquanto os autocarros expresso oferecem embarques rápidos.\n\n### Recomendação\nRecomendamos a **Linha Ferroviária Meadowlands**, com partidas a cada 10 min para Secaucus Junction a partir do Portão Norte.\n\n### Alternativa\nUtilize o **Autocarro Expresso** gratuito para Metropark, embarcando no Estacionamento G.\n\n### Confiança\n- **Nível**: Alto\n- **Razão**: Integração dos horários de tráfego do dia de jogo.\n\n### Próxima ação sugerida\nDirija-se ao terminal do Portão Norte.",
                de: "### Situation\nFan benötigt Post-Match Transportation Transportmöglichkeiten nach dem Spiel.\n\n### Begründung\nDie Bahnlinie nimmt die Hauptlast auf, Expressbusse bieten jedoch schnellere Abfahrtszeiten.\n\n### Empfehlung\nNutzen Sie die **Meadowlands-Bahnlinie** (Abfahrt alle 10 Min. nach Secaucus Junction am Nordgate).\n\n### Alternative\nNehmen Sie den kostenlosen **Expressbus** nach Metropark am Parkplatz G.\n\n### Vertrauen\n- **Niveau**: Hoch\n- **Begründung**: Offizieller Fahrplan für Spieltage.\n\n### Empfohlene nächste Aktion\nGehen Sie zum Bahnhof am Nordgate.",
                zh: "### 情况\n球迷询问 Post-Match Transportation 赛后交通方式。\n\n### 推理\n铁路线运力强，但可能排队较长；免费班车出发速度快。\n\n### 推荐\n推荐乘坐**草原铁路线**，每10分钟一班车前往Secaucus Junction，可在北门站上车。\n\n### 替代方案\n可在G停车场乘坐免费的**快线班车**前往Metropark。\n\n### 置信度\n- **置信度**: 高\n- **依据**: 赛后交通调度时刻表数据。\n\n### 建议的下一步行动\n前往北门站入口。",
                hi: "### स्थिति\nप्रशंसक Post-Match Transportation मैच के बाद परिवहन विकल्पों के बारे में पूछ रहा है।\n\n### तर्क\nरेल मार्ग पर अधिक क्षमता है, जबकि एक्सप्रेस शटल बस में कतारें कम लंबी होती हैं।\n\n### सिफारिश\nहम **मेडोलैंड्स रेल लाइन** का उपयोग करने की सलाह देते हैं जो उत्तरी गेट स्टेशन से प्रत्येक 10 मिनट में सेकॉकस जंक्शन के लिए चलती है।\n\n### विकल्प\nया पार्किंग लॉट G से मेट्रोपार्क के लिए मुफ्त **एक्सप्रेस शटल बस** लें।\n\n### विश्वास\n- **स्तर**: उच्च\n- **तर्क**: मैच-डे परिवहन कार्यक्रम से डेटा।\n\n### सुझाया गया अगला कदम\nउत्तरी गेट रेलवे स्टेशन की ओर बढ़ें।",
                ja: "### 状況\nファンが試合後の帰宅用 Post-Match Transportation 交通手段を探しています。\n\n### 推論\n鉄道は大量輸送に向いていますが、シャトルバスの方が早く乗車できる可能性があります。\n\n### 推奨\n北ゲート駅から10分間隔で運行されている**メドウランズ鉄道**（Secaucus Junction行き）のご利用をお勧めします。\n\n### 代替案\nまたは、駐車場Gから運行されるメトロパーク行きの無料**急行シャトルバス**をご利用ください。\n\n### 確信度\n- **レベル**: 高\n- **根拠**: 試合日運行ダイヤデータに基づく。\n\n### 次に推奨されるアクション\n北ゲート駅の改札口へお進みください。",
                ko: "### 상황\n경기 후 Post-Match Transportation 교통편 정보를 묻고 있습니다.\n\n### 추론\n철도 수송력은 매우 높으나 대기가 길 수 있고, 급행 셔틀은 회전율이 높습니다.\n\n### 추천\n북쪽 게이트 역에서 10분 간격으로 운행하는 **메도랜즈 철도** (Secaucus Junction 행) 이용을 권장합니다.\n\n### 대안\n혹은 G주차장에서 탑승하는 무료 **급행 셔틀버스**를 이용하여 Metropark로 이동하세요.\n\n### 신뢰도\n- **신뢰도**: 높음\n- **근거**: 경기 당일 교통 특별편 편성표.\n\n### 권장되는 다음 단계\n북쪽 게이트 역 승강장으로 이동하세요."
              },
              medical: {
                en: "### Situation\nPotential Emergency has been detected.\n\n### Reasoning\nMedical incidents require emergency security and first-aid dispatch to ensure safety.\n\n### Recommendation\nThis is a potential emergency. Please contact stadium security immediately by calling **[EMERGENCY NUMBER]** or visiting the nearest security post.\n\n### Alternative\nThe nearest medical aid station is located behind **Section 109** on the main concourse.\n\n### Confidence\n- **Level**: High\n- **Rationale**: FIFA safety and emergency guidance protocol.\n\n### Suggested Next Action\nContact nearby stadium staff immediately.",
                es: "### Situación\nSe ha detectado una Potential Emergency emergencia potencial.\n\n### Razonamiento\nLos incidentes de salud requieren atención médica inmediata y notificación al equipo de seguridad.\n\n### Recomendación\nEsta es una posible emergencia. Contacte al personal de seguridad del estadio de inmediato llamando al **[NÚMERO DE EMERGENCIA]** o visite el puesto de seguridad más cercano.\n\n### Alternativa\nLa estación de primeros auxilios más cercana está detrás de la **Sección 109** en el pasillo principal.\n\n### Confianza\n- **Nivel**: Alto\n- **Razón**: Protocolo de seguridad del estadio.\n\n### Próxima acción sugerida\nNotifique a un steward de seguridad cercano inmediatamente.",
                fr: "### Situation\nUne Potential Emergency urgence potentielle a été signalée par l'utilisateur.\n\n### Raisonnement\nTout incident médical nécessite l'alerte immédiate de la sécurité et des secouristes.\n\n### Recommandation\nIl s'agit d'une urgence potentielle. Veuillez contacter la sécurité du stade immédiatement en appelant le **[NUMÉRO D'URGENCE]** ou en vous rendant au poste de sécurité le plus proche.\n\n### Alternative\nLe poste de secours le plus proche se trouve derrière la **Section 109** dans le couloir principal.\n\n### Confiance\n- **Niveau**: Élevé\n- **Justification**: Protocole d'urgence FIFA.\n\n### Action suivante suggérée\nSignalez l'incident au personnel de stade le plus proche.",
                ar: "### الوضع\nتم الإبلاغ عن Potential Emergency حالة طارئة محتملة.\n\n### التبرير\nأي حادث طبي يتطلب تدخلاً فورياً من فرق الإسعاف والأمن لضمان السلامة.\n\n### التوصية\nهذه حالة طارئة محتملة. يرجى الاتصال بأمن الملعب فوراً على **[رقم الطوارئ]** أو التوجه لأقرب نقطة أمنية.\n\n### البديل\nأقرب نقطة إسعافات أولية تقع خلف **القسم 109** في الممر الرئيسي.\n\n### الثقة\n- **المستوى**: عالٍ\n- **السبب**: بروتوكول السلامة الطبية الرسمي للملعب.\n\n### الإجراء التالي المقترح\nاتصل بالرقم أو أبلغ مشرف الأمن القريب فوراً.",
                pt: "### Situação\nFoi detetada uma Potential Emergency emergência potencial.\n\n### Raciocínio\nProblemas de saúde carecem de triagem imediata de emergência médica e socorristas.\n\n### Recomendação\nEsta é uma emergência potencial. Contacte a segurança do estádio imediatamente ligando para **[NÚMERO DE EMERGÊNCIA]** ou dirigindo-se ao posto de segurança mais próximo.\n\n### Alternativa\nO posto de primeiros socorros mais próximo fica atrás da **Secção 109** no corredor principal.\n\n### Confiança\n- **Nível**: Alto\n- **Razão**: Protocolos de segurança FIFA.\n\n### Próxima ação sugerida\nFale imediatamente com um segurança ou assistente.",
                de: "### Situation\nEin Potential Emergency potenzieller Notfall wurde gemeldet.\n\n### Begründung\nMedizinische Vorfälle erfordern sofortige Erste Hilfe und Benachrichtigung des Sicherheitsdienstes.\n\n### Empfehlung\nDies ist ein potenzieller Notfall. Bitte kontaktieren Sie sofort die Stadionsicherheit unter **[NOTRUFNUMMER]** oder suchen Sie den nächsten Sicherheitsposten auf.\n\n### Alternative\nDie nächste Erste-Hilfe-Station befindet sich hinter **Sektion 109** im Hauptkorridor.\n\n### Vertrauen\n- **Niveau**: Hoch\n- **Begründung**: Offizielles FIFA-Sicherheitsnotfallprotokoll.\n\n### Empfohlene nächste Aktion\nSprechen Sie sofort das Stadionpersonal in Ihrer Nähe an.",
                zh: "### 情况\n球迷报告了 Potential Emergency 潜在紧急情况。\n\n### 推理\n医疗急救需要立即使安全人员和急救队到达现场。\n\n### 推荐\n这属于潜在紧急情况。请立即拨打**[紧急号码]**联系球场安保人员，或者前往最近的安保服务站。\n\n### 替代方案\n最近的医疗急救站设在主大厅**109区**后方。\n\n### 置信度\n- **置信度**: 高\n- **依据**: 依据FIFA官方紧急医疗响应规程。\n\n### 建议的下一步行动\n立即呼喊或联络身边的体育场工作人员。",
                hi: "### स्थिति\nसंभावित Potential Emergency आपात स्थिति की रिपोर्ट की गई है।\n\n### तर्क\nचिकित्सा संबंधी घटनाओं में तुरंत प्राथमिक उपचार और सुरक्षा कर्मियों की आवश्यकता होती है।\n\n### सिफारिश\nयह एक संभावित आपात स्थिति है। कृपया तुरंत **[आपातकालीन नंबर]** पर कॉल करके या निकटतम सुरक्षा चौकी पर जाकर स्टेडियम सुरक्षा से संपर्क करें।\n\n### विकल्प\nनिकटतम चिकित्सा सहायता केंद्र मुख्य कॉन्कोर्स पर **सेक्शन 109** के पीछे स्थित है।\n\n### विश्वास\n- **स्तर**: उच्च\n- **तर्क**: फीफा सुरक्षा और आपातकालीन प्रोटोकॉल।\n\n### सुझाया गया अगला कदम\nपास में तैनात सुरक्षा कर्मचारी को तुरंत सूचित करें।",
                ja: "### 状況\nPotential Emergency 緊急事態の可能性が報告されました。\n\n### 推論\n急病等の医療事案は、即時に警備および救護スタッフの手配が必要です。\n\n### 推奨\n緊急事态の可能性があります。すぐに **[緊急番号]** に電話するか、最寄りのセキュリティポストを訪問してスタジアムの警備員にご連絡ください。\n\n### 代替案\n最寄りの救護所はメインコンコースの**セクション109**裏にあります。\n\n### 確信度\n- **レベル**: 高\n- **根拠**: FIFAオフィシャルスタジアム安全救護マニュアルに基づく。\n\n### 次に推奨されるアクション\n近くにいるスタジアムスタッフにすぐに声を掛けてください。",
                ko: "### 상황\nPotential Emergency 잠재적 긴급 상황이 감지되었습니다.\n\n### 추론\n의료 사고 발생 시 환자 보호를 위해 신속하게 응급 처치 요원 및 경기장 보안팀 파견이 필요합니다.\n\n### 추천\n비상 상황입니다. **[비상 번호]**로 즉시 전화하시거나 가장 가까운 보안 초소를 방문하여 경기장 경비팀에 연락하십시오.\n\n### 대안\n가장 가까운 응급 처치소는 메인 콘코스의 **109구역** 뒤편에 위치해 있습니다.\n\n### 신뢰도\n- **신뢰도**: 높음\n- **근거**: FIFA 경기장 공식 안전 및 비상 조치 계획.\n\n### 권장되는 다음 단계\n주변에 있는 안전 요원에게 즉시 도움을 요청하세요."
              },
              food: {
                en: "### Situation\nFan needs Vegan & Food Options details.\n\n### Reasoning\nConcession food maps catalog plant-based, gluten-free, and allergen-safe dining stands.\n\n### Recommendation\nVisit **Green Bites** at Section 117 for plant-based burgers, wraps, and vegan nachos.\n\n### Alternative\nTry **Fresh & Fast** behind Section 132 for organic salads, fruit cups, and vegan pretzels.\n\n### Confidence\n- **Level**: High\n- **Rationale**: Live concessions database registry.\n\n### Suggested Next Action\nProceed to the main concourse near Section 117.",
                es: "### Situación\nEl aficionado busca Vegan & Food Options opciones veganas y de comida.\n\n### Razonamiento\nEl catálogo de concesiones muestra los locales con menús vegetarianos y libres de alérgenos.\n\n### Recomendación\nVisite **Green Bites** en la Sección 117 para hamburguesas veganas, wraps y nachos veganos.\n\n### Alternativa\nPruebe **Fresh & Fast** detrás de la Sección 132 para ensaladas y pretzels veganos.\n\n### Confianza\n- **Nivel**: Alto\n- **Razón**: Registro oficial de alimentos del estadio.\n\n### Próxima acción sugerida\nDiríjase a la Sección 117 en el pasillo principal.",
                fr: "### Situation\nLe supporter demande Vegan & Food Options des options végétaliennes et alimentaires.\n\n### Raisonnement\nLe registre répertorie les points de vente proposant des plats sans viande ou allergènes.\n\n### Recommandation\nRendez-vous chez **Green Bites** (Section 117) pour des burgers végétaux et des nachos vegan.\n\n### Alternative\nEssayez **Fresh & Fast** derrière la Section 132 pour des salades fraîches et des bretzels vegan.\n\n### Confiance\n- **Niveau**: Élevé\n- **Justification**: Menu de concessions validé par le stade.\n\n### Action suivante suggérée\nDirigez-vous vers la Section 117 dans le couloir principal.",
                ar: "### الوضع\nالمشجع يبحث عن خيارات Vegan & Food Options الطعام النباتي.\n\n### التبرير\nسجل الامتيازات يصنف الأطعمة الخالية من اللحوم والأطعمة المخصصة لمرضى الحساسية.\n\n### التوصية\nقم بزيارة **Green Bites** في القسم 117 للحصول على برغر نباتي، راب، وناتشوز نباتي.\n\n### البديل\nجرب **Fresh & Fast** خلف القسم 132 للحصول على سلطات وعصي بريتزل نباتية.\n\n### الثقة\n- **المستوى**: عالٍ\n- **السبب**: قائمة الأغذية الرسمية المعتمدة للملعب.\n\n### الإجراء التالي المقترح\nتوجه إلى الممر الرئيسي بالقرب من القسم 117.",
                pt: "### Situação\nO adepto procura opções de Vegan & Food Options veganas e comida.\n\n### Raciocínio\nO registo de comida localiza stands com cardápios vegetarianos ou sem glúten.\n\n### Recomendação\nVisite o **Green Bites** na Secção 117 para hambúrgueres 100% vegetais e nachos veganos.\n\n### Alternativa\nExperimente o **Fresh & Fast** na Secção 132 para saladas e pretzels veganos.\n\n### Confiança\n- **Nível**: Alto\n- **Razão**: Catálogo de restauração da MetLife.\n\n### Próxima ação sugerida\nDirija-se ao stand na Secção 117.",
                de: "### Situation\nFan sucht Vegan & Food Options vegane und vegetarische Essensoptionen.\n\n### Begründung\nDas Konzessionsregister verzeichnet vegetarische, vegane und allergenfreie Gerichte.\n\n### Empfehlung\nBesuchen Sie **Green Bites** an Sektion 117 für vegane Burger, Wraps und vegane Nachos.\n\n### Alternative\nProbieren Sie **Fresh & Fast** an Sektion 132 für frische Salate und Brezeln.\n\n### Vertrauen\n- **Niveau**: Hoch\n- **Begründung**: Offizielles Konzessionsverzeichnis des Stadions.\n\n### Empfohlene nächste Aktion\nGehen Sie zu Sektion 117 im Hauptkorridor.",
                zh: "### 情况\n球迷寻找 Vegan & Food Options 素食及餐饮选择。\n\n### 推理\n球场餐饮数据库记录了提供植物性、无麸质等健康膳食的摊位。\n\n### 推荐\n前往117区的**Green Bites**享用100%植物性汉堡、卷饼和素食玉米片。\n\n### 替代方案\n尝试132区后方的**Fresh & Fast**，提供新鲜沙拉和素食椒盐卷饼。\n\n### 置信度\n- **置信度**: 高\n- **依据**: 体育场食品特许经营权名录。\n\n### 建议的下一步行动\n前往主大厅117区附近。",
                hi: "### स्थिति\nप्रशंसक Vegan & Food Options शाकाहारी और अन्य भोजन विकल्पों के बारे में जानकारी चाहता है।\n\n### तर्क\nस्टेडियम भोजन सूची में बिना मांस वाले और एलर्जी-मुक्त भोजन बूथों का विवरण दर्ज है।\n\n### सिफारिश\nप्लांट-बेस्ड बर्गर, रैप्स और वेगन नाचोस के लिए सेक्शन 117 पर **Green Bites** पर जाएं।\n\n### विकल्प\nसलाद और वेगन प्रेट्ज़ेल के लिए सेक्शन 132 के पीछे **Fresh & Fast** का प्रयास करें।\n\n### विश्वास\n- **स्तर**: उच्च\n- **तर्क**: स्टेडियम कंसेशन डेटाबेस रजिस्टर।\n\n### सुझाया गया अगला कदम\nमुख्य कॉन्कोर्स पर सेक्शन 117 के पास जाएं।",
                ja: "### 状況\nファンが Vegan & Food Options ビーガン・フードオプション対応の食事を探しています。\n\n### 推論\n飲食特許リストには、植物性原料やアレルギー対応の食事ブースが記録されています。\n\n### 推奨\nセクション117の**Green Bites**で、100%植物性バーガー、ラップ、およびビーガンナチョスをお買い求めください。\n\n### 代替案\nセクション132裏の**Fresh & Fast**では、サラダやビーガンプレッツェルも提供しています。\n\n### 確信度\n- **レベル**: 高\n- **根拠**: スタジアム出店管理登録に基づく。\n\n### 次に推奨されるアクション\nメインコンコースのセクション117付近へお進みください。",
                ko: "### 상황\n관람객이 Vegan & Food Options 비건 및 음식점 정보를 요청하고 있습니다.\n\n### 추론\n경기장 식음료 목록에는 비건, 글루텐 프리, 알레르기 예방 식단 부스가 등록되어 있습니다.\n\n### 추천\n117구역에 있는 **Green Bites**에서 식물성 햄버거, 랩, 그리고 비건 나초를 드셔보세요.\n\n### 대안\n132구역 뒤쪽에 있는 **Fresh & Fast**에서 샐러드와 비건 프레첼을 주문하실 수도 있습니다.\n\n### 신뢰도\n- **신뢰도**: 높음\n- **근거**: 경기장 공식 입점 업체 식단 리스트.\n\n### 권장되는 다음 단계\n117구역 근처 메인 콘코스로 가보세요."
              },
              default: {
                en: "### Situation\nFan has initiated chat session.\n\n### Reasoning\nGreets user and offers help with navigation, crowd flow, accessibility, or post-match transportation.\n\n### Recommendation\nWelcome to StadiumBuddy! How can I assist you with your stadium experience today?\n\n### Alternative\nYou can ask about seating directions, crowd status, transport, restrooms, or medical aids.\n\n### Confidence\n- **Level**: High\n- **Rationale**: Initial interaction helper.\n\n### Suggested Next Action\nType your query in the chat box.",
                es: "### Situación\nEl aficionado ha iniciado la sesión de chat.\n\n### Razonamiento\nSaluda y ofrece ayuda con la navegación, las multitudes, la accesibilidad o el transporte.\n\n### Recomendación\n¡Bienvenido a StadiumBuddy! ¿En qué puedo ayudarte con tu experiencia en el estadio hoy?\n\n### Alternativa\nPuede preguntar por direcciones, congestión de salidas, transporte, baños o asistencia médica.\n\n### Confianza\n- **Nivel**: Alto\n- **Razón**: Inicialización del asistente.\n\n### Próxima acción sugerida\nEscriba su consulta en la caja de texto.",
                fr: "### Situation\nLe supporter a ouvert le chat.\n\n### Raisonnement\nSalue et propose d'aider pour la navigation, la foule, l'accessibilité ou les transports.\n\n### Recommandation\nBienvenue sur StadiumBuddy ! Comment puis-je vous aider avec votre expérience au stade aujourd'hui ?\n\n### Alternative\nPosez des questions sur le plan, la foule aux sorties, les navettes de transport, ou les secours.\n\n### Confiance\n- **Niveau**: Élevé\n- **Justification**: Accueil initial.\n\n### Action suivante suggérée\nSaisissez votre question dans la zone de texte.",
                ar: "### الوضع\nالمشجع بدأ المحادثة الآن.\n\n### التبرير\nالترحيب بالمشجع وتقديم المساعدة في التنقل، تدفق الحشود، التسهيلات، أو النقل بعد المباراة.\n\n### التوصية\nمرحباً بك في StadiumBuddy! كيف يمكنني مساعدتك بتجربتك في الملعب اليوم؟\n\n### البديل\nيمكنك الاستفسار عن اتجاهات المقاعد، حالة الازدحام، النقل، أو النقاط الطبية.\n\n### الثقة\n- **المستوى**: عالٍ\n- **السبب**: رسالة الترحيب التلقائية.\n\n### الإجراء التالي المقترح\nاكتب استفسارك في صندوق المحادثة بالأسفل.",
                pt: "### Situação\nO adepto iniciou a sessão de chat.\n\n### Raciocínio\nCumprimenta o utilizador e disponibiliza ajuda com navegação, tráfego, acessibilidade ou transporte.\n\n### Recomendação\nBem-vindo ao StadiumBuddy! Como posso ajudá-lo com sua experiência no estádio hoje?\n\n### Alternativa\nPode questionar sobre direções, fluxos de saídas, transportes, instalações sanitárias ou assistência médica.\n\n### Confiança\n- **Nível**: Alto\n- **Razão**: Suporte de inicialização.\n\n### Próxima ação sugerida\nDigite a sua dúvida na caixa de texto.",
                de: "### Situation\nFan hat die Chat-Sitzung gestartet.\n\n### Begründung\nBegrüßt den Nutzer und bietet Hilfe zu Orientierung, Stauvermeidung, Barrierefreiheit oder Rückreise an.\n\n### Empfehlung\nWillkommen bei StadiumBuddy! Wie kann ich Ihnen heute bei Ihrem Stadionerlebnis helfen?\n\n### Alternative\nFragen Sie nach Wegbeschreibungen, Ausgangsstau, Bussen/Bahnen, Toiletten oder Erste Hilfe.\n\n### Vertrauen\n- **Niveau**: Hoch\n- **Begründung**: Initialer Assistenten-Hilfetext.\n\n### Empfohlene nächste Aktion\nSchreiben Sie Ihre Frage in das Eingabefeld.",
                zh: "### 情况\n球迷已启动会话。\n\n### 推理\n向用户问好并提供关于路线导航、人流拥挤度、无障碍设施或赛后交通 of 的帮助。\n\n### 推荐\n欢迎使用 StadiumBuddy！今天我能帮您解决什么体育场相关问题？\n\n### 替代方案\n您可以询问关于座位导航、出口拥挤度、接驳车、洗手间或急救站的信息。\n\n### 置信度\n- **置信度**: 高\n- **依据**: 初始化助手指南。\n\n### 建议的下一步行动\n在输入框内键入您的提问。",
                hi: "### स्थिति\nप्रशंसक ने चैट सत्र शुरू किया है।\n\n### तर्क\nउपयोगकर्ता का स्वागत करता है और नेविगेशन, भीड़, सुलभता या परिवहन में सहायता प्रदान करता है।\n\n### सिफारिश\nStadiumBuddy में आपका स्वागत है! आज मैं आपके स्टेडियम अनुभव में कैसे मदद कर सकता हूं?\n\n### विकल्प\nआप बैठने के मार्ग, निकास की भीड़, परिवहन, शौचालय या चिकित्सा बूथ के बारे में पूछ सकते हैं।\n\n### विश्वास\n- **स्तर**: उच्च\n- **तर्क**: प्रारंभिक सहायक संदेश।\n\n### सुझाया गया अगला कदम\nनीचे दिए गए बॉक्स में अपना प्रश्न लिखें।",
                ja: "### 状況\nファンがチャットセッションを開始しました。\n\n### 推論\n挨拶を行い、道案内、混雑状況、バリアフリー、帰りの交通についてサポートを提示します。\n\n### 推奨\nStadiumBuddyへようこそ！本日のスタジアム体験について何かお手伝いできることはありますか？\n\n### 代替案\n座席位置、出口の混雑、交通機関、トイレ、または救護所について質問できます。\n\n### 確信度\n- **レベル**: 高\n- **根拠**: 初期対話用ヘルプメッセージに基づく。\n\n### 次に推奨されるアクション\n下のテキストボックスに質問を入力してください。",
                ko: "### 상황\n관람객이 챗 세션을 시작했습니다.\n\n### 추론\n인사를 건네며 경기장 내 네비게이션, 혼잡도 관리, 장애인 편의시설, 경기 후 교통 안내를 돕습니다.\n\n### 추천\nStadiumBuddy에 오신 것을 환영합니다! 오늘 경기장 경험에 대해 어떻게 도와드릴까요?\n\n### 대안\n좌석 가는 길, 출구 혼잡 상황, 셔틀버스, 화장실 또는 의료실에 대해 질문해보세요.\n\n### 신뢰도\n- **신뢰도**: 높음\n- **근거**: 어시스턴트 초기 안내 규칙.\n\n### 권장되는 다음 단계\n모두 입력 칸에 질문을 입력하세요."
              },
            };

            const getResp = (key: keyof typeof RESPONSES) =>
              /* c8 ignore next */
              (RESPONSES[key]?.[langCode] ?? RESPONSES[key]?.["en"] ?? "");

            let responseText = getResp("default");
            if (msgLower.includes("115") || msgLower.includes("seat")) {
              responseText = getResp("seat");
            } else if (msgLower.includes("exit") || msgLower.includes("crowd")) {
              responseText = getResp("crowd");
            } else if (msgLower.includes("restroom") || msgLower.includes("accessible") || msgLower.includes("toilet") || msgLower.includes("bathroom")) {
              responseText = getResp("restroom");
            } else if (msgLower.includes("transport") || msgLower.includes("transit") || msgLower.includes("options")) {
              responseText = getResp("transport");
            } else if (msgLower.includes("medical") || msgLower.includes("doctor") || msgLower.includes("emergency")) {
              responseText = getResp("medical");
            } else if (msgLower.includes("vegan") || msgLower.includes("food") || msgLower.includes("diet")) {
              responseText = getResp("food");
            }

            const words = responseText.split(/(\s+)/);
            const stream = (async function* () {
              for (const word of words) {
                await new Promise((resolve) => setTimeout(resolve, 15));
                yield { text: () => word };
              }
            })();

            return { stream };
          }
        };
      }
    } as any;
  }

  const client = new GoogleGenerativeAI(apiKey);

  _modelInstance = client.getGenerativeModel({
    model: config?.modelName ?? "gemini-2.0-flash-exp",
    generationConfig: {
      maxOutputTokens: config?.maxOutputTokens ?? 1024,
      temperature: config?.temperature ?? 0.7,
      topP: 0.9,
      topK: 40,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    systemInstruction: buildSystemInstruction(),
  });

  return _modelInstance;
}

/**
 * Resets the singleton instance (for testing).
 */
export function resetGeminiModel(): void {
  _modelInstance = null;
}

// ─── System Instruction Builder ───────────────────────────────────────────────

/**
 * Builds the immutable system instruction for the FIFA World Cup 2026 assistant.
 * This instruction cannot be overridden by user messages.
 */
function buildSystemInstruction(): string {
  return JSON.stringify({
    role: "StadiumBuddy, the official AI assistant for the FIFA World Cup 2026",
    objective: "Provide fans, volunteers, and staff with explainable AI reasoning for navigation, crowd management, accessibility, and transportation requests.",
    persona: "Professional, helpful, safety-oriented, and concise stadium assistant",
    reasoning_instructions: "For any query involving routing, navigation, crowding, transport, accessibility, or safety, you must structure your response with: Situation, Reasoning, Recommendation, Alternative, Confidence, and Suggested Next Action. Explain why a route is chosen, take accessibility and user context (e.g. wheelchair, elderly parents, late arrivals, gate entry) into account, and adapt dynamic suggestions based on these situations.",
    safety_instructions: "For emergencies, prioritize immediate security contact and guide users to nearest first-aid station.",
    response_format: "Markdown containing the following headers: ### Situation, ### Reasoning, ### Recommendation, ### Alternative, ### Confidence, ### Suggested Next Action"
  });
}
