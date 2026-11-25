
const {
  Section,
  Classe,
  User,
  Etudiant,
  EnseignantSection,
  EnseignantClasse,
} = require('../models');

const { buildFault, FaultCodes } = require('../utils/erreurs');

// ============================================================
// HELPERS
// ============================================================

function normalizeIds(value, fieldName) {
  if (value === undefined || value === null) return [];

  const values = Array.isArray(value) ? value : [value];

  if (values.some((id) => typeof id !== 'string' || !id.trim())) {
    throw buildFault(
      FaultCodes.VALEUR_INVALIDE,
      `La liste ${fieldName} contient un identifiant invalide`
    );
  }

  return [...new Set(values)];
}

async function getTeacher(userId) {
  if (!userId) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      'Champs obligatoires manquants',
      ['userId']
    );
  }

  const user = await User.findByPk(userId);

  if (!user) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Utilisateur #${userId} introuvable`
    );
  }

  if (user.role !== 'enseignant') {
    throw buildFault(
      FaultCodes.VALEUR_INVALIDE,
      "L'utilisateur n'est pas un enseignant"
    );
  }

  return user;
}

// ============================================================
// SECTION CRUD
// ============================================================

async function creerSection(args) {
  const { nom, description } = args || {};

  if (!nom) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      'Champs obligatoires manquants',
      ['nom']
    );
  }

  const exists = await Section.findOne({ where: { nom } });

  if (exists) {
    throw buildFault(
      FaultCodes.DOUBLON,
      `Une section "${nom}" existe déjà`
    );
  }

  const section = await Section.create({
    nom,
    description: description || null,
  });

  return { section: toSection(section) };
}

async function listerSections() {
  const sections = await Section.findAll({
    include: [{ model: Classe, as: 'classes' }],
    order: [['nom', 'ASC']],
  });

  return {
    sections: {
      section: sections.map(toSection),
    },
  };
}

async function modifierSection(args) {
  const { id, nom, description } = args || {};

  if (!id) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      'Champs obligatoires manquants',
      ['id']
    );
  }

  const section = await Section.findByPk(id);

  if (!section) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Section #${id} introuvable`
    );
  }

  if (nom && nom !== section.nom) {
    const duplicate = await Section.findOne({ where: { nom } });

    if (duplicate) {
      throw buildFault(
        FaultCodes.DOUBLON,
        `Une section "${nom}" existe déjà`
      );
    }

    section.nom = nom;
  }

  if (description !== undefined) {
    section.description = description || null;
  }

  await section.save();

  return { section: toSection(section) };
}


async function supprimerSection(args) {
  const { id } = args || {};

  if (!id) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      "Champs obligatoires manquants",
      ["id"]
    );
  }

  const section = await Section.findByPk(id);

  if (!section) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Section #${id} introuvable`
    );
  }

  const transaction = await Section.sequelize.transaction();

  try {
    // 1. Récupérer les classes de cette section.
    const classesSection = await Classe.findAll({
      where: { sectionId: id },
      attributes: ["id"],
      transaction,
    });

    const classeIds = classesSection.map((classe) => classe.id);

    // 2. Ne pas supprimer une section contenant encore des étudiants.
    const conditionsEtudiants = [{ sectionId: id }];

    if (classeIds.length > 0) {
      conditionsEtudiants.push({ classeId: classeIds });
    }

    const etudiants = await Etudiant.findAll({
      where: {
        [require("sequelize").Op.or]: conditionsEtudiants,
      },
      attributes: ["id"],
      transaction,
    });

    if (etudiants.length > 0) {
      throw buildFault(
        FaultCodes.VALEUR_INVALIDE,
        "Impossible de supprimer cette section : des étudiants y sont encore affectés. Réaffectez-les d'abord à une autre section ou classe."
      );
    }

    // 3. Supprimer les affectations des enseignants à cette section.
    await EnseignantSection.destroy({
      where: { sectionId: id },
      transaction,
    });

    // 4. Supprimer les affectations des enseignants à ses classes.
    if (classeIds.length > 0) {
      await EnseignantClasse.destroy({
        where: { classeId: classeIds },
        transaction,
      });

      // 5. Supprimer les classes de la section.
      await Classe.destroy({
        where: { id: classeIds },
        transaction,
      });
    }

    // 6. Supprimer la section.
    await Section.destroy({
      where: { id },
      transaction,
    });

    await transaction.commit();

    return {
      succes: true,
      message: `Section "${section.nom}" et ses classes supprimées`,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ============================================================
// CLASSE CRUD
// ============================================================

async function creerClasse(args) {
  const { nom, sectionId } = args || {};
  const missing = [];

  if (!nom) missing.push('nom');
  if (!sectionId) missing.push('sectionId');

  if (missing.length) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      'Champs obligatoires manquants',
      missing
    );
  }

  const section = await Section.findByPk(sectionId);

  if (!section) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Section #${sectionId} introuvable`
    );
  }

  const classe = await Classe.create({ nom, sectionId });

  const fresh = await Classe.findByPk(classe.id, {
    include: [{ model: Section, as: 'section' }],
  });

  return { classe: toClasse(fresh) };
}

async function listerClasses(args) {
  const where = {};

  if (args && args.sectionId) {
    where.sectionId = args.sectionId;
  }

  const classes = await Classe.findAll({
    where,
    include: [{ model: Section, as: 'section' }],
    order: [['nom', 'ASC']],
  });

  return {
    classes: {
      classe: classes.map(toClasse),
    },
  };
}

async function modifierClasse(args) {
  const { id, nom, sectionId } = args || {};

  if (!id) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      'Champs obligatoires manquants',
      ['id']
    );
  }

  const classe = await Classe.findByPk(id);

  if (!classe) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Classe #${id} introuvable`
    );
  }

  if (sectionId && sectionId !== classe.sectionId) {
    const section = await Section.findByPk(sectionId);

    if (!section) {
      throw buildFault(
        FaultCodes.INTROUVABLE,
        `Section #${sectionId} introuvable`
      );
    }

    classe.sectionId = sectionId;
  }

  if (nom) classe.nom = nom;

  await classe.save();

  const fresh = await Classe.findByPk(id, {
    include: [{ model: Section, as: 'section' }],
  });

  return { classe: toClasse(fresh) };
}

async function supprimerClasse(args) {
  const { id } = args || {};

  if (!id) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      'Champs obligatoires manquants',
      ['id']
    );
  }

  const classe = await Classe.findByPk(id);

  if (!classe) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Classe #${id} introuvable`
    );
  }

  await classe.destroy();

  return {
    succes: true,
    message: `Classe "${classe.nom}" supprimée`,
  };
}

// ============================================================
// TEACHER ASSIGNMENTS
// ============================================================

/**
 * Remplace les sections affectées à un enseignant.
 * Une liste vide retire toutes ses affectations de section.
 * Les affectations aux classes ne sont pas modifiées.
 */

/** Remplace les affectations de sections d'un enseignant. */
async function assignerEnseignantSections(args) {
  const { userId } = args || {};
  const sectionIds = Array.isArray(args?.sectionIds)
    ? [...new Set(args.sectionIds.filter(Boolean))]
    : [];

  if (!userId) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      "Champs obligatoires manquants",
      ["userId"]
    );
  }

  const user = await User.findByPk(userId);

  if (!user) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Utilisateur #${userId} introuvable`
    );
  }

  if (user.role !== "enseignant") {
    throw buildFault(
      FaultCodes.VALEUR_INVALIDE,
      "L'utilisateur n'est pas un enseignant"
    );
  }

  // Une liste vide est autorisée : elle signifie retirer toutes
  // les affectations de sections de cet enseignant.
  const transaction = await EnseignantSection.sequelize.transaction();

  try {
    if (sectionIds.length > 0) {
      const existingSections = await Section.findAll({
        where: { id: sectionIds },
        attributes: ["id"],
        transaction,
      });

      const existingIds = new Set(
        existingSections.map((section) => section.id)
      );

      const invalidIds = sectionIds.filter((id) => !existingIds.has(id));

      if (invalidIds.length > 0) {
        throw buildFault(
          FaultCodes.INTROUVABLE,
          `Section(s) introuvable(s) : ${invalidIds.join(", ")}`
        );
      }
    }

    await EnseignantSection.destroy({
      where: { userId },
      transaction,
    });

    if (sectionIds.length > 0) {
      await EnseignantSection.bulkCreate(
        sectionIds.map((sectionId) => ({ userId, sectionId })),
        { transaction }
      );
    }

    await transaction.commit();

    return {
      succes: true,
      message: `${sectionIds.length} section(s) affectée(s) à l'enseignant`,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/** Remplace les affectations de classes d'un enseignant. */
async function assignerEnseignantClasses(args) {
  const { userId } = args || {};
  const classeIds = Array.isArray(args?.classeIds)
    ? [...new Set(args.classeIds.filter(Boolean))]
    : [];

  if (!userId) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      "Champs obligatoires manquants",
      ["userId"]
    );
  }

  const user = await User.findByPk(userId);

  if (!user) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Utilisateur #${userId} introuvable`
    );
  }

  if (user.role !== "enseignant") {
    throw buildFault(
      FaultCodes.VALEUR_INVALIDE,
      "L'utilisateur n'est pas un enseignant"
    );
  }

  // Une liste vide signifie retirer toutes les affectations de classes.
  const transaction = await EnseignantClasse.sequelize.transaction();

  try {
    if (classeIds.length > 0) {
      const existingClasses = await Classe.findAll({
        where: { id: classeIds },
        attributes: ["id"],
        transaction,
      });

      const existingIds = new Set(
        existingClasses.map((classe) => classe.id)
      );

      const invalidIds = classeIds.filter((id) => !existingIds.has(id));

      if (invalidIds.length > 0) {
        throw buildFault(
          FaultCodes.INTROUVABLE,
          `Classe(s) introuvable(s) : ${invalidIds.join(", ")}`
        );
      }
    }

    await EnseignantClasse.destroy({
      where: { userId },
      transaction,
    });

    if (classeIds.length > 0) {
      await EnseignantClasse.bulkCreate(
        classeIds.map((classeId) => ({ userId, classeId })),
        { transaction }
      );
    }

    await transaction.commit();

    return {
      succes: true,
      message: `${classeIds.length} classe(s) affectée(s) à l'enseignant`,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}


/** Consulte les sections et classes affectées à un enseignant. */
async function consulterAffectationsEnseignant(args) {
  const { userId } = args || {};

  await getTeacher(userId);

  const sections = await EnseignantSection.findAll({
    where: { userId },
    include: [{ model: Section, as: 'section' }],
  });

  const classes = await EnseignantClasse.findAll({
    where: { userId },
    include: [{ model: Classe, as: 'classe' }],
  });

  return {
    affectations: {
      sections: sections
        .map((item) => toSection(item.section))
        .filter(Boolean),
      classes: classes
        .map((item) => toClasse(item.classe))
        .filter(Boolean),
    },
  };
}

// ============================================================
// STUDENT ASSIGNMENT
// ============================================================

async function assignerEtudiantSection(args) {
  const { etudiantId, sectionId, classeId } = args || {};
  const missing = [];

  if (!etudiantId) missing.push('etudiantId');
  if (!sectionId) missing.push('sectionId');
  if (!classeId) missing.push('classeId');

  if (missing.length) {
    throw buildFault(
      FaultCodes.CHAMP_MANQUANT,
      'Champs obligatoires manquants',
      missing
    );
  }

  const etudiant = await Etudiant.findByPk(etudiantId);

  if (!etudiant) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Étudiant #${etudiantId} introuvable`
    );
  }

  const section = await Section.findByPk(sectionId);

  if (!section) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Section #${sectionId} introuvable`
    );
  }

  const classe = await Classe.findByPk(classeId);

  if (!classe) {
    throw buildFault(
      FaultCodes.INTROUVABLE,
      `Classe #${classeId} introuvable`
    );
  }

  if (String(classe.sectionId) !== String(sectionId)) {
    throw buildFault(
      FaultCodes.VALEUR_INVALIDE,
      `La classe "${classe.nom}" n'appartient pas à la section "${section.nom}"`
    );
  }

  etudiant.sectionId = sectionId;
  etudiant.classeId = classeId;

  await etudiant.save();

  const user = await User.findByPk(etudiant.userId);

  if (user) {
    user.classe = classe.nom;
    await user.save();
  }

  return {
    succes: true,
    message: `Étudiant assigné à la section "${section.nom}" / classe "${classe.nom}"`,
  };
}

// ============================================================
// SHAPERS
// ============================================================

function toSection(section) {
  if (!section) return null;

  const result = {
    id: section.id,
    nom: section.nom,
    description: section.description || '',
  };

  if (section.classes) {
    result.classes = section.classes.map(toClasse);
  }

  return result;
}

function toClasse(classe) {
  if (!classe) return null;

  const result = {
    id: classe.id,
    nom: classe.nom,
    sectionId: classe.sectionId,
  };

  if (classe.section) {
    result.sectionNom = classe.section.nom;
  }

  return result;
}

module.exports = {
  creerSection,
  listerSections,
  modifierSection,
  supprimerSection,
  creerClasse,
  listerClasses,
  modifierClasse,
  supprimerClasse,
  assignerEnseignantSections,
  assignerEnseignantClasses,
  consulterAffectationsEnseignant,
  assignerEtudiantSection,
  toSection,
  toClasse,
};
