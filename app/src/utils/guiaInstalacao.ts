import type { NavegadorIOS } from '../hooks/useInstalarApp';

/**
 * Onde fica o controle a tocar, em cada navegador do iPhone.
 *
 * Fica fora do componente porque é lógica pura — e porque errar o lado é pior
 * que não apontar nada. A armadilha grande está no Safari do iOS 26: o layout
 * padrão (Compact) esconde o ícone de compartilhar atrás de um "⋯" no canto
 * inferior esquerdo. O layout é escolha do usuário em Ajustes e não dá para
 * detectar, então a instrução cobre os dois casos.
 */
export interface ConfigGuia {
  titulo: string;
  /** Onde fica o controle a tocar. */
  barra: 'baixo' | 'topo';
  alinhamento: 'esquerda' | 'centro' | 'direita';
  /** Símbolo desenhado no botão destacado. */
  simbolo: 'compartilhar' | 'reticencias';
  legendas: [string, string, string];
}

export function configurarGuia(nav: NavegadorIOS, versao: number | null): ConfigGuia {
  const iOS26 = (versao ?? 0) >= 26;

  if (nav === 'chrome') {
    return {
      titulo: 'Instalar pelo Chrome',
      barra: 'topo',
      alinhamento: 'direita',
      simbolo: 'compartilhar',
      legendas: [
        'Toque no ícone de compartilhar, ao lado do endereço',
        'Escolha "Adicionar à Tela de Início"',
        'Confirme em "Adicionar" — o ícone vai para a tela',
      ],
    };
  }

  if (nav === 'edge') {
    return {
      titulo: 'Instalar pelo Edge',
      barra: 'baixo',
      alinhamento: 'direita',
      simbolo: 'reticencias',
      legendas: [
        'Toque no menu (⋯), na barra de baixo',
        'Escolha "Adicionar à Tela de Início"',
        'Confirme em "Adicionar" — o ícone vai para a tela',
      ],
    };
  }

  // Safari
  return iOS26
    ? {
      titulo: 'Instalar pelo Safari',
      barra: 'baixo',
      alinhamento: 'esquerda',
      simbolo: 'reticencias',
      legendas: [
        // No iOS 26 o layout padrão esconde o compartilhar atrás do "⋯"
        'Toque no ⋯ no canto de baixo (ou no ícone de compartilhar, se ele aparecer)',
        'Escolha "Adicionar à Tela de Início"',
        'Confirme em "Adicionar" — o ícone vai para a tela',
      ],
    }
    : {
      titulo: 'Instalar pelo Safari',
      barra: 'baixo',
      alinhamento: 'centro',
      simbolo: 'compartilhar',
      legendas: [
        'Toque no ícone de compartilhar, na barra de baixo',
        'Role a lista e escolha "Adicionar à Tela de Início"',
        'Confirme em "Adicionar" — o ícone vai para a tela',
      ],
    };
}

