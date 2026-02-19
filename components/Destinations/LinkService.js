/**
 * Links Service - Gère la logique des liens pour les destinations
 */

const LinksService = {
    /**
     * Vérifier et convertir les "null" en null JavaScript
     */
    checkIfNull(value) {
        return value === 'null' ? null : value;
    },

    /**
     * Générer un ID unique pour un lien
     */
    generateLinkId() {
        return 'link_' + Date.now().toString(36);
    },

    /**
     * Créer une card de lien
     */
    createLinkCard(link, readonly = false, activityId = null) {
        let cardClass = 'link-card';
        if (readonly) cardClass += ' read-only-link-card';
        
        let onClickAttr = '';
        let titleAttr = '';
        if (readonly) {
            onClickAttr = `onclick="window.open('${link.url}', '_blank')"`;
            titleAttr = 'title="Ouvrir dans un nouvel onglet"';
        }
        
        let html = `
            <div class="${cardClass}"
            data-link-id="${link.id}"
            data-url="${link.url}" ${onClickAttr} ${titleAttr}>
                <div class="link-info">
                    <span class="link-name">${link.name}</span>
        `;
        
        if (readonly) {
            html += `
                <span class="material-icons">open_in_new</span>
            `;
        } else {
            html += `
                <button class="btn-edit-link" onclick="LinksService.editLink('${link.id}', '${activityId}')" title="Modifier le lien">
                    <span class="material-icons">edit</span>
                </button>
            `;
        }
        
        if (!readonly) {
            html += `
                <button class="btn-remove-link" onclick="LinksService.removeLink('${link.id}', null, '${activityId}')" title="Supprimer le lien">
                    <span class="material-icons">close</span>
                </button>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    },

    /**
     * Ouvrir une modal pour ajouter ou modifier un lien
     */
    openModal(destinationId, activityId = null, editMode = false, linkId = null, currentName = '', currentUrl = '') {    
        // Convertir les chaînes "null" en null JavaScript
        destinationId = this.checkIfNull(destinationId);
        activityId = this.checkIfNull(activityId);
        linkId = this.checkIfNull(linkId);
        
        const modal = document.createElement('div');
        modal.className = 'modal links-modal open';
        
        const modalId = Date.now().toString();
            
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="LinksService.closeModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${editMode ? 'Modifier un lien' : 'Ajouter un lien'}</h3>
                    <button class="btn-close" onclick="LinksService.closeModal()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group full-width">
                        <label class="form-label" for="linkName-${modalId}">Nom du lien</label>
                        <input type="text" class="form-input" id="linkName-${modalId}" value="${editMode ? currentName : ''}" placeholder="Ex: Site officiel, Billets, etc.">
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label" for="linkUrl-${modalId}">URL</label>
                        <input type="url" class="form-input" id="linkUrl-${modalId}" value="${editMode ? currentUrl : ''}" placeholder="https://example.com">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-save" onclick="LinksService.saveLink('${destinationId}', '${modalId}', ${!editMode}, ${editMode ? `'${linkId}'` : null}, '${activityId}')">
                        <span class="material-icons">save</span> Sauvegarder
                    </button>
                    <button class="btn-cancel" onclick="LinksService.closeModal()">
                        Annuler
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        setTimeout(() => {
            const nameField = document.getElementById(`linkName-${modalId}`);
            if (nameField) {
                nameField.focus();
                if (editMode) nameField.select();
            }
        }, 150);
    },

    /**
     * Sauvegarder un lien (ajout ou modification)
     */
    saveLink(destinationId, modalId, newLink = true, linkId = null, activityId = null) {
        // Convertir les chaînes "null" en null JavaScript
        destinationId = this.checkIfNull(destinationId);
        activityId = this.checkIfNull(activityId);
        linkId = this.checkIfNull(linkId);
        
        // Logs de débogage
        console.log('🔍 Debug saveLink start:', { destinationId, modalId, newLink, linkId, activityId });
        
        const nameInput = document.getElementById(`linkName-${modalId}`);
        const urlInput = document.getElementById(`linkUrl-${modalId}`);
        
        console.log('🔍 Debug inputs:', { nameInput, urlInput });
        
        if (!nameInput || !urlInput) {
            console.error('❌ Champs du formulaire non trouvés');
            return;
        }
        
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        
        console.log('🔍 Debug values:', { name, url });
        
        if (!name || !url) {
            window.showErrorSnackBar('Veuillez remplir tous les champs');
            return;
        }
        
        try {
            const targetId = activityId || destinationId;
            const targetType = activityId ? 'activity' : 'destination';
            
            // Logs de débogage
            console.log('🔍 Debug saveLink:', { destinationId, activityId, targetId, targetType });
            
            // Récupérer les liens selon le type
            let links;
            if (activityId && activityId) {
                links = window.Activity ? window.Activity.links : [];
                console.log('🔍 Links from Activity:', links);
            } else {
                links = window.Destination ? window.Destination.links : [];
                console.log('🔍 Links from Destination:', links);
            }
            
            console.log('🔍 Links array before save:', links);
            
            if (newLink) {
                // Ajout d'un nouveau lien
                const newLinkId = this.generateLinkId();
                links.push({ id: newLinkId, name, url });
                
                const linkCardHTML = this.createLinkCard({ id: newLinkId, name, url }, false, activityId);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = linkCardHTML;
                const linkCard = tempDiv.firstElementChild;
                
                const linksList = document.getElementById(`links-${targetId}`);
                if (linksList) linksList.appendChild(linkCard);
                
                console.log('✅ Lien ajouté:', newLinkId, 'pour', targetType);
            } else {
                // Modifier un lien existant
                const linkIndex = links.findIndex(l => l.id === linkId);
                if (linkIndex !== -1) {
                    links[linkIndex] = { id: linkId, name, url };
                    
                    // Ne modifier que la carte dans le formulaire d'édition, pas celle en mode lecture
                    const editForm = document.querySelector(`#form-${targetId}`) || document.querySelector('#activityPopup');
                    if (editForm) {
                        const linkCard = editForm.querySelector(`[data-link-id="${linkId}"]`);
                        if (linkCard) {
                            linkCard.setAttribute('data-url', url);
                            const linkName = linkCard.querySelector('.link-name');
                            if (linkName) linkName.textContent = name;
                        }
                    }
                    
                    console.log('✅ Lien modifié:', linkId, 'pour', targetType);
                } else {
                    console.error('❌ Lien non trouvé:', linkId);
                    window.showErrorSnackBar('Lien non trouvé');
                }
            }
            
            this.closeModal();
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du lien:', error);
            window.showErrorSnackBar('Erreur lors de la sauvegarde du lien');
        }
    },

    /**
     * Fermer la modal
     */
    closeModal() {
        const modal = document.querySelector('.links-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    },

    /**
     * Modifier un lien existant
     */
    editLink(linkId, activityId = null) {
        // Convertir les chaînes "null" en null JavaScript
        activityId = this.checkIfNull(activityId);
        
        const targetId = activityId || window.Destination.currentDestinationId;
        const targetType = activityId ? 'activity' : 'destination';
        
        // Logs de débogage
        console.log('🔍 Debug editLink:', { linkId, activityId, targetId, targetType });
        
        // Récupérer les liens selon le type
        let links;
        if (activityId) {
            links = window.Activity ? window.Activity.links : [];
            console.log('🔍 Links from Activity:', links);
        } else {
            links = window.Destination ? window.Destination.links : [];
            console.log('🔍 Links from Destination:', links);
        }
                
        const link = links.find(l => l.id === linkId);
        if (!link) {
            console.error('❌ Lien non trouvé:', linkId, 'dans', links.length, 'liens');
            return;
        }

        console.log('🔍 Link trouvé:', link);

        
        this.openModal(activityId ? null : targetId, activityId, true, linkId, link.name, link.url);
    },

    /**
     * Supprimer un lien
     */
    removeLink(linkId, links, activityId = null) {
        // Convertir les chaînes "null" en null JavaScript
        activityId = this.checkIfNull(activityId);
        
        if (!links) {
            // Récupérer les liens selon le type
            if (activityId) {
                links = window.Activity ? window.Activity.links : [];
            } else {
                links = window.Destination ? window.Destination.links : [];
            }
        }
        
        const targetId = activityId || window.Destination.currentDestinationId;
        const targetType = activityId ? 'activity' : 'destination';
                
        try {
            const linkIndex = links.findIndex(l => l.id === linkId);
            if (linkIndex !== -1) {
                links.splice(linkIndex, 1);
                
                // Ne supprimer que la carte dans le formulaire d'édition, pas celle en mode lecture
                const editForm = document.querySelector(`#form-${targetId}`) || document.querySelector('#activityPopup');
                if (editForm) {
                    const linkCard = editForm.querySelector(`[data-link-id="${linkId}"]`);
                    if (linkCard) linkCard.remove();
                }
                
                console.log('✅ Lien supprimé de la liste:', linkId, 'pour', targetType);
            } else {
                console.error('❌ Lien non trouvé dans la liste:', linkId);
                window.showErrorSnackBar('Lien non trouvé');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la suppression du lien:', error);
            window.showErrorSnackBar('Erreur lors de la suppression du lien');
        }
    },

    /**
     * Recharger la liste des liens depuis l'objet destination ou activité
     */
    reloadLinksList(destinationId, links, activityId = null) {
        const targetId = activityId || destinationId;
        const linksList = document.getElementById(`links-${targetId}`);
        if (!linksList) return;
        
        // Vider la liste actuelle
        linksList.innerHTML = '';
        
        // Recréer les cartes de liens
        if (links && links.length > 0) {
            links.forEach(link => {
                const linkCardHTML = this.createLinkCard(link, false, activityId);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = linkCardHTML;
                const linkCard = tempDiv.firstElementChild;
                linksList.appendChild(linkCard);
            });
        }
        
        console.log('✅ Liste des liens rechargée:', links.length, 'liens pour', activityId ? 'activité' : 'destination');
    }
};

// Exporter pour utilisation globale
window.LinksService = LinksService;
