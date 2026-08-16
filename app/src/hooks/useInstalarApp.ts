import { useState, useEffect, useCallback } from 'react';

/**
 * Estado da instalação do app na tela de início.
 *
 * Há dois mundos, e a diferença não dá para esconder:
 *
 * - **Android e desktop (Chrome, Edge, Samsung…)**: o navegador dispara
 *   `beforeinstallprompt` quando o app cumpre os critérios de instalação.
 *   Guardamos o evento e chamamos `prompt()` num gesto do usuário — aí sim é
 *   "clicou, instalou".
 *
 * - **iPhone e iPad**: a Apple não implementa `beforeinstallprompt`. Não
 *   existe instalação programática, ponto. O único caminho é o usuário abrir o
 *   menu Compartilhar e tocar em "Adicionar à Tela de Início". O melhor que dá
 *   para fazer é reconhecer o Safari e ensinar o passo a passo.
 */

interface PromptDeInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type ModoInstalacao =
  | 'indisponivel'   // navegador não instala, ou ainda não cumpre os critérios
  | 'automatico'     // dá para chamar o diálogo nativo
  | 'manual-ios'     // precisa do passo a passo do Safari
  | 'instalado';     // já está rodando como app

/** true quando a página está aberta como app, não como aba. */
function rodandoComoApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    // Safari no iOS usa uma propriedade própria, fora do padrão
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ehIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ se apresenta como Mac; o toque desempata.
  const iPadModerno = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadModerno;
}

/** Qual navegador do iOS, para dar o passo a passo certo. */
export type NavegadorIOS = 'safari' | 'chrome' | 'edge' | 'in-app' | 'outro';

/**
 * Navegador embutido em outro app (WhatsApp, Instagram, Facebook…).
 *
 * Importa muito aqui: o convite do clube é um link compartilhado, e a chance
 * de ser aberto de dentro do WhatsApp é enorme. Nesses navegadores a opção
 * "Adicionar à Tela de Início" simplesmente não existe — mostrar o passo a
 * passo ali manda a pessoa procurar um menu que não está lá.
 */
export function ehNavegadorInApp(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|LinkedInApp|Snapchat|Pinterest|TikTok|MicroMessenger/i.test(ua)
    // O WhatsApp no iOS não se identifica; entrega um WebKit sem Safari no UA
    || (/iPhone|iPad/.test(ua) && /AppleWebKit/.test(ua) && !/Safari|CriOS|FxiOS|EdgiOS|OPiOS/.test(ua));
}

export function navegadorIOS(): NavegadorIOS {
  if (!ehIOS()) return 'outro';
  if (ehNavegadorInApp()) return 'in-app';
  const ua = navigator.userAgent;
  if (/CriOS/.test(ua)) return 'chrome';
  if (/EdgiOS/.test(ua)) return 'edge';
  if (/FxiOS|OPiOS/.test(ua)) return 'outro';
  return 'safari';
}

/**
 * Versão maior do iOS, quando dá para saber.
 *
 * Importa porque o Safari do iOS 26 redesenhou a barra: no layout Compact, que
 * é o padrão, o ícone de compartilhar deixou de aparecer e vive atrás de um
 * "⋯" no canto inferior esquerdo. Mandar procurar o ícone de compartilhar num
 * iPhone atual é mandar procurar o que não está na tela.
 *
 * O layout em si (Compact, Bottom ou Top) é escolha do usuário em Ajustes e
 * não dá para detectar — por isso a instrução cobre os dois casos.
 */
export function versaoIOS(): number | null {
  if (!ehIOS()) return null;
  const m = /(?:CPU |iPhone )OS (\d+)/.exec(navigator.userAgent);
  return m ? Number(m[1]) : null;
}

/**
 * Quem instala no iOS.
 *
 * Por muito tempo só o Safari tinha "Adicionar à Tela de Início". A partir do
 * iOS 17 o Chrome e o Edge também passaram a oferecer, pelo botão de
 * compartilhar na barra de endereço. Firefox e Opera continuam de fora — para
 * eles não adianta mostrar instrução que não existe.
 */
function podeInstalarNoIOS(): boolean {
  const nav = navegadorIOS();
  return nav === 'safari' || nav === 'chrome' || nav === 'edge' || nav === 'in-app';
}

export function useInstalarApp() {
  const [prompt, setPrompt] = useState<PromptDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(rodandoComoApp);

  useEffect(() => {
    const aoPoderInstalar = (e: Event) => {
      // Sem isto, o Chrome mostra a própria barrinha e perdemos o controle
      // de quando e onde oferecer.
      e.preventDefault();
      setPrompt(e as PromptDeInstalacao);
    };
    const aoInstalar = () => { setInstalado(true); setPrompt(null); };

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);

    // Se a pessoa instalar e abrir pelo ícone, o display-mode muda sem recarregar
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const aoMudarModo = () => setInstalado(rodandoComoApp());
    mq?.addEventListener?.('change', aoMudarModo);

    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
      mq?.removeEventListener?.('change', aoMudarModo);
    };
  }, []);

  const modo: ModoInstalacao = instalado
    ? 'instalado'
    : prompt
      ? 'automatico'
      : podeInstalarNoIOS()
        ? 'manual-ios'
        : 'indisponivel';

  /**
   * Abre o diálogo nativo. Devolve o que a pessoa escolheu, ou null quando o
   * navegador não oferece esse caminho (iOS, ou critérios não cumpridos).
   */
  const instalar = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!prompt) return null;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // O evento é de uso único: depois de consumido, o navegador só emite outro
    // numa próxima visita.
    setPrompt(null);
    return outcome;
  }, [prompt]);

  return { modo, instalar, ehIOS: ehIOS() };
}
