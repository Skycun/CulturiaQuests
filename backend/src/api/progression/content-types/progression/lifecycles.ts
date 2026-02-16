/**
 * Lifecycle hooks for the Progression content type
 */

module.exports = {
  async afterCreate(event) {
    await checkAndCompleteParent(event);
  },

  async afterUpdate(event) {
    await checkAndCompleteParent(event);
  },
};

async function checkAndCompleteParent(event) {
  const { result } = event;

  // On ne s'intéresse qu'aux progressions validées
  if (!result.is_completed) return;

  // On a besoin de savoir à quelle guilde appartient cette progression
  // Si le populate n'a pas été fait, on le refetch
  let progression = result;
  if (!progression.guild || !progression.comcom || !progression.department) {
    progression = await strapi.documents('api::progression.progression').findOne({
      documentId: result.documentId,
      populate: ['guild', 'comcom', 'comcom.department', 'department', 'department.region']
    });
  }

  const guildDocId = progression.guild?.documentId;
  if (!guildDocId) return;

  // CAS 1 : C'est une COMCOM -> Vérifier le Département
  if (progression.comcom) {
    const department = progression.comcom.department;
    if (!department) return; // Comcom orpheline

    await tryCompleteParent(
      'api::comcom.comcom',           // Child Type
      'api::department.department',   // Parent Type
      'department',                   // Relation field name in Child
      department.documentId,          // Parent documentId
      guildDocId                      // Guild documentId
    );
  }

  // CAS 2 : C'est un DÉPARTEMENT -> Vérifier la Région
  else if (progression.department) {
    const region = progression.department.region;
    if (!region) return;

    await tryCompleteParent(
      'api::department.department',
      'api::region.region',
      'region',
      region.documentId,
      guildDocId
    );
  }
}

/**
 * Vérifie si tous les enfants d'un parent sont complétés par la guilde.
 * Si oui, crée la progression pour le parent.
 */
async function tryCompleteParent(childType, parentType, relationField, parentDocId, guildDocId) {
  // 1. Compter le nombre TOTAL d'enfants pour ce parent
  const totalChildren = await strapi.documents(childType).count({
    filters: {
      [relationField]: { documentId: parentDocId }
    }
  });

  if (totalChildren === 0) return;

  // 2. Compter le nombre d'enfants COMPLÉTÉS par la guilde
  const progressionField = childType.split('.')[1]; // 'comcom' ou 'department'

  const completedChildren = await strapi.documents('api::progression.progression').count({
    filters: {
      guild: { documentId: guildDocId },
      is_completed: true,
      [progressionField]: {
        [relationField]: { documentId: parentDocId }
      }
    }
  });

  strapi.log.info(`[Progression] Checking parent ${parentType} (${parentDocId}): ${completedChildren}/${totalChildren} children completed.`);

  // 3. Si tout est complété, on valide le parent
  if (completedChildren >= totalChildren) {
    const parentProgressionField = parentType.split('.')[1]; // 'department' ou 'region'

    // Vérifier si la progression parent existe déjà
    const existingParentProgressions = await strapi.documents('api::progression.progression').findMany({
      filters: {
        guild: { documentId: guildDocId },
        [parentProgressionField]: { documentId: parentDocId }
      },
      limit: 1
    });

    if (existingParentProgressions.length === 0) {
      strapi.log.info(`[Progression] Auto-completing parent ${parentType} (${parentDocId}) for guild ${guildDocId}`);
      await strapi.documents('api::progression.progression').create({
        data: {
          is_completed: true,
          guild: guildDocId,
          [parentProgressionField]: parentDocId
        }
      });
    } else if (!existingParentProgressions[0].is_completed) {
      strapi.log.info(`[Progression] Auto-completing existing parent ${parentType} (${parentDocId})`);
      await strapi.documents('api::progression.progression').update({
        documentId: existingParentProgressions[0].documentId,
        data: { is_completed: true }
      });
    }
  }
}
