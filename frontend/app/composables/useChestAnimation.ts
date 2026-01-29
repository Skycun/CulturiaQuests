import anime from 'animejs'

/**
 * Composable for chest opening animations
 */
export function useChestAnimation() {
  /**
   * Animate chest bounce/shake before opening
   */
  async function animateChestBounce(element: HTMLElement) {
    await anime({
      targets: element,
      scale: [1, 1.2, 1],
      rotate: [0, -10, 10, -10, 0],
      duration: 800,
      easing: 'easeInOutQuad'
    }).finished
  }

  /**
   * Fade out an element
   */
  async function animateFadeOut(element: HTMLElement) {
    await anime({
      targets: element,
      opacity: [1, 0],
      duration: 500,
      easing: 'easeInQuad'
    }).finished
  }

  /**
   * Animate loot badges appearance with scale effect
   */
  function createBadgesAnimation(element: HTMLElement) {
    return {
      targets: element,
      opacity: [0, 1],
      translateY: [20, 0],
      scale: [0.8, 1],
      duration: 600
    }
  }

  /**
   * Animate individual loot item appearance
   */
  function createItemAnimation(element: HTMLElement) {
    return {
      targets: element,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 500
    }
  }

  /**
   * Animate all loot elements (badges + items) with staggered timing
   */
  async function animateLootDisplay(
    badgesElement: HTMLElement | undefined,
    itemElements: HTMLElement[]
  ) {
    const timeline = anime.timeline({
      easing: 'easeOutExpo'
    })

    // Animate badges first
    if (badgesElement) {
      timeline.add(createBadgesAnimation(badgesElement), 0)
    }

    // Animate items one by one with overlap
    itemElements.forEach((el, index) => {
      if (el) {
        timeline.add(
          createItemAnimation(el),
          index === 0 ? 200 : '-=350'
        )
      }
    })

    return timeline.finished
  }

  return {
    animateChestBounce,
    animateFadeOut,
    animateLootDisplay,
    createBadgesAnimation,
    createItemAnimation
  }
}
