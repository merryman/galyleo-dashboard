// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { IMarkdownViewerTracker } from '@jupyterlab/markdownviewer';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { GalyleoEditor } from './toc';
import '../style/index.css';
import { ICommandPalette } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { TextModelFactory, DocumentRegistry, ABCWidgetFactory } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components'; // WTF???
import galyleoSvgstr from '../style/engageLively.svg';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { JSONValue } from '@phosphor/coreutils';
import { Signal } from '@phosphor/signaling';
import { IModelDB } from '@jupyterlab/observables';

export class GalyleoModel extends CodeEditor.Model implements DocumentRegistry.ICodeModel {

  contentChanged: any;
  stateChanged: any;

  readOnly = false;
  // we dont need those
  defaultKernelName = '';
  defaultKernelLanguage = '';

  id = 'foo bar';
  
  constructor(options?: CodeEditor.Model.IOptions) {
    super(options)
    this.value // this contains the json as a string as soon as its loaded
    this.contentChanged = new Signal(this);
    this.stateChanged = new Signal(this);
  }

  get dirty() {
    // get response from iframe
    return false;
  }

  set dirty (v) {
    if (v == false) {
      // tell studio that we want to be saved
    }
  }


  toString(): string {
    return JSON.stringify(this.toJSON());
  }
  fromString(value: string): void {
    this.fromJSON(JSON.parse(value));
  }
  toJSON(): JSONValue {
    // get json snapshot from 
    throw new Error('Method not implemented.');
  }
  fromJSON(value: any): void {
    // send json to iframe
    throw new Error('Method not implemented.');
  }
  initialize(): void {
    // send data to iframe
  }

}

/**
 * An implementation of a model factory for base64 files.
 */
export class GalyleoModelFactory extends TextModelFactory {
  /**
   * The name of the model type.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name() {
    return 'galyleo'
  }

  /**
   * The type of the file.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentType(): Contents.ContentType {
    return 'file';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
   */
  get fileFormat(): Contents.FileFormat {
    return 'json';
  }

  

  createNew(languagePreference?: string | undefined, modelDb?: IModelDB) {
    return new GalyleoModel();
  }
 
}

export class GalyleoStudioFactory extends ABCWidgetFactory<GalyleoEditor, GalyleoModel> {
  /**
   * Construct a new mimetype widget factory.
   */
  // constructor(options) {
  //     super(options);
  // }
  /**
   * Create a new widget given a context.
   */
  createNewWidget(context: DocumentRegistry.IContext<GalyleoModel>, source: any) {
      // fixme: not sure what source is...
      return new GalyleoEditor({
        context,
        content: source
      });
  }
}

export const galyleoIcon = new LabIcon({
  name: 'Galyleopkg:galyleo',
  svgstr: galyleoSvgstr
});
/**
 *
 * Activates the ToC extension.
 *
 * @private
 * @param app - Jupyter application
 * @param docmanager - document manager
 * @param editorTracker - editor tracker
 * @param labShell - Jupyter lab shell
 * @param restorer - application layout restorer
 * @param markdownViewerTracker - Markdown viewer tracker
 * @param notebookTracker - notebook tracker
 * @param rendermime - rendered MIME registry
 * @returns table of contents registry
 */

function activateTOC(
  app: JupyterFrontEnd,
  docmanager: IDocumentManager,
  editorTracker: IEditorTracker,
  labShell: ILabShell,
  restorer: ILayoutRestorer,
  markdownViewerTracker: IMarkdownViewerTracker,
  notebookTracker: INotebookTracker,
  rendermime: IRenderMimeRegistry,
  browserFactory: IFileBrowserFactory,
  palette: ICommandPalette,
  mainMenu: IMainMenu,
  launcher: ILauncher,
): void {
  const modelFactory = new GalyleoModelFactory();
  app.docRegistry.addModelFactory(<any>modelFactory);
  
  //app.docRegistry.addWidgetFactory()
  // set up the file extension

  app.docRegistry.addFileType({
    name: 'Galyleo',
    icon: <any>galyleoIcon, // shut up the tsc compiler for god's sake
    displayName: 'Galyleo Dashboard File',
    extensions: ['.gd', '.gd.json'],
    fileFormat: 'text',
    contentType: 'file',
    mimeTypes: ['application/json']
  });

  // we need a different factory that returns widgets which
  // allow us to intercept undo/redo/save commands

  // this factory only works for files that are purely text based
  const widgetFactory = new GalyleoStudioFactory({
    name: 'Galyleo Studio',
    fileTypes: ['Galyleo'],
    defaultRendered: ['Galyleo'],
    defaultFor: ['Galyleo']
  });

  app.docRegistry.addWidgetFactory(<any>widgetFactory);

  // set up the main menu commands

  const newCommand = 'galyleo-editor:new-dashboard';
  // const renameCommand = 'galyleo-editor:renameDashboard'; // will add later

  // New dashboard command -- tell the docmanager to open up a
  // galyleo dashboard file, and then tell the editor to edit it,
  // sending the pathname to the editor

  app.commands.addCommand(newCommand, {
    label: 'Galyleo Dashboard',
    caption: 'Open a new Galyleo Dashboard',
    icon: galyleoIcon,
    execute: async (args: any) => {
      // Create a new untitled python file
      const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
      await app.commands.execute('docmanager:new-untitled', {
        path: cwd,
        contentType: 'file',
        ext: 'gd.json',
        fileFormat: 'json',
        type: 'file'
      });
      // open that dashboard
    }
  });

  launcher.add({
    command: newCommand,
  });

  mainMenu.fileMenu.newMenu.addGroup(
    [{ command: newCommand }],
    30
  );

  // Add the commands to the main menu

  const category = 'Galyleo  Dashboard';
  palette.addItem({ command: newCommand, category: category, args: {} });

  // mainMenu.fileMenu.addGroup([
  //   { command: newCommand }, // handled by all the other default menu entries
  //   { command: loadCommand }, // handled by double clicking, right click open with command
  //   { command: saveCommand }, // handled by the already existing file save command
  //   { command: saveAsCommand }, // we can rename stuff alredy in the extension, this is not needed
  //   { command: changeRoomCommand } // this should be done from within the extension if at all needed
  // ]);
}

/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-toc',
  autoStart: true,
  requires: [
    IDocumentManager,
    IEditorTracker,
    ILabShell,
    ILayoutRestorer,
    IMarkdownViewerTracker,
    INotebookTracker,
    IRenderMimeRegistry,
    IFileBrowserFactory,
    ICommandPalette,
    IMainMenu,
    ILauncher
  ],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
