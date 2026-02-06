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
  const { result, params } = event;
  
  // On ne s'intéresse qu'aux progressions validées
  if (!result.is_completed) return;

  // On a besoin de savoir à quelle guilde appartient cette progression
  // Si le populate n'a pas été fait, on le refetch
  let progression = result;
  if (!progression.guild || !progression.comcom || !progression.department) {
    progression = await strapi.entityService.findOne('api::progression.progression', result.id, {
      populate: ['guild', 'comcom', 'comcom.department', 'department', 'department.region']
    });
  }

  const guildId = progression.guild?.id;
  if (!guildId) return;

  // CAS 1 : C'est une COMCOM -> Vérifier le Département
  if (progression.comcom) {
    const department = progression.comcom.department;
    if (!department) return; // Comcom orpheline

    await tryCompleteParent(
      'api::comcom.comcom',     // Child Type
      'api::department.department', // Parent Type
      'department',             // Relation field name in Child
      department.id,            // Parent ID
      guildId                   // Guild ID
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
      region.id,
      guildId
    );
  }
}

/**
 * Vérifie si tous les enfants d'un parent sont complétés par la guilde.
 * Si oui, crée la progression pour le parent.
 */
async function tryCompleteParent(childType, parentType, relationField, parentId, guildId) {
  // 1. Compter le nombre TOTAL d'enfants pour ce parent
  const totalChildren = await strapi.entityService.count(childType, {
    filters: {
      [relationField]: parentId
    }
  });

  if (totalChildren === 0) return;

  // 2. Compter le nombre d'enfants COMPLÉTÉS par la guilde
  // On cherche les progressions qui :
  // - Sont liées à la guilde
  // - Sont completed
  // - Dont l'objet lié (ex: comcom) a pour parent (ex: dept) le parentId
  
  // Il faut trouver le nom du champ dans Progression qui correspond au childType (ex: 'comcom' ou 'department')
  const progressionField = childType.split('.')[1]; // 'comcom' ou 'department'

  const completedChildren = await strapi.entityService.count('api::progression.progression', {
    filters: {
      guild: guildId,
      is_completed: true,
      [progressionField]: {
        [relationField]: parentId
      }
    }
  });

  console.log(`[Progression] Checking parent ${parentType} (${parentId}): ${completedChildren}/${totalChildren} children completed.`);

  // 3. Si tout est complété, on valide le parent
  if (completedChildren >= totalChildren) {
    const parentProgressionField = parentType.split('.')[1]; // 'department' ou 'region'

    // Vérifier si la progression parent existe déjà
    const existingParentProgression = await strapi.entityService.findMany('api::progression.progression', {
      filters: {
        guild: guildId,
        [parentProgressionField]: parentId
      },
      limit: 1
    });

    if (existingParentProgression.length === 0) {
      console.log(`[Progression] ✨ Auto-completing parent ${parentType} (${parentId}) for guild ${guildId}`);
      await strapi.entityService.create('api::progression.progression', {
        data: {
          is_completed: true,
          guild: guildId,
          [parentProgressionField]: parentId
        }
      });
    } else if (!existingParentProgression[0].is_completed) {
      console.log(`[Progression] ✨ Auto-completing existing parent ${parentType} (${parentId})`);
      await strapi.entityService.update('api::progression.progression', existingParentProgression[0].id, {
        data: { is_completed: true }
      });
    }
  }
}
